// Deploys one build as two Workers:
//   store  the public shop (APP_ROLE=store; admin paths answer 404)
//   admin  the admin panel only (APP_ROLE=admin), on its own address
//
// Run after `vinext build` (`npm run deploy` does both).
// The admin Worker's name comes from ADMIN_WORKER_NAME or the git-ignored
// .env.deploy file, so the admin address is never in the repository.
// Pass --no-r2 while R2 is not enabled on the Cloudflare account.
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

const noR2 = process.argv.includes('--no-r2');
const localEnv = existsSync('.env.deploy')
  ? Object.fromEntries(
      readFileSync('.env.deploy', 'utf8')
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/))
        .filter(Boolean)
        .map((match) => [match[1], match[2]]),
    )
  : {};
const adminName = process.env.ADMIN_WORKER_NAME ?? localEnv.ADMIN_WORKER_NAME;
if (!adminName || !/^[a-z0-9-]{3,63}$/.test(adminName)) {
  console.error(
    'Set ADMIN_WORKER_NAME (lowercase letters, numbers, hyphens) in .env.deploy, e.g.\n  ADMIN_WORKER_NAME=<a-hard-to-guess-name>',
  );
  process.exit(1);
}

const built = JSON.parse(readFileSync('dist/server/wrangler.json', 'utf8'));
if (built.d1_databases?.some((db) => /^0{8}-/.test(db.database_id))) {
  console.error(
    'wrangler.jsonc still has the placeholder D1 database_id. Create the database first:\n  npx wrangler d1 create bsgaming',
  );
  process.exit(1);
}

// The Instagram gallery's media is not in git (about 2 GB). Refuse to deploy
// a build whose gallery would point at files that are not there.
const instagram = JSON.parse(readFileSync('data/instagram.json', 'utf8'));
const media = instagram.posts.flatMap((post) => [
  post.thumb,
  post.thumb?.replace(/thumb\.webp$/, 'thumb-240.webp'),
  ...post.slides.flatMap((slide) => [slide.src, slide.poster]),
]);
const absent = media.filter(
  (url) => url && !existsSync(join('dist', 'client', url)),
);
if (absent.length) {
  console.error(
    `${absent.length} Instagram media files are missing (first: ${absent[0]}). Import them first:\n  npm run instagram:import -- "<path to the blackshark-instagram archive>"`,
  );
  process.exit(1);
}

function wrangler(args) {
  const result = spawnSync(
    process.execPath,
    [join('node_modules', 'wrangler', 'bin', 'wrangler.js'), ...args],
    { encoding: 'utf8' },
  );
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ''}${result.stderr ?? ''}`,
  };
}

// The admin site never shows the Instagram gallery, so its static files leave
// out the ~2 GB of media instead of uploading it twice.
function adminAssets() {
  const dir = join('dist', 'admin-client');
  rmSync(dir, { recursive: true, force: true });
  cpSync(join('dist', 'client'), dir, {
    recursive: true,
    filter: (source) => !/[\\/]client[\\/](ig|og)([\\/]|$)/.test(source),
  });
  return '../admin-client';
}

function deploy(name, vars) {
  const config = { ...built, name, vars: { ...built.vars, ...vars } };
  if (vars.APP_ROLE === 'admin')
    config.assets = { ...built.assets, directory: adminAssets() };
  if (noR2) delete config.r2_buckets;
  // Written next to the built config so its relative paths still resolve.
  const file = join('dist', 'server', `wrangler.${vars.APP_ROLE}.json`);
  writeFileSync(file, JSON.stringify(config, null, 2));
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = wrangler(['deploy', '--config', file]);
    if (result.ok) {
      // Match this Worker's own address, not a URL printed among its variables.
      const url = result.output.match(
        new RegExp(`https://${name}\\.[a-z0-9-]+\\.workers\\.dev`),
      )?.[0];
      console.log(`Deployed ${vars.APP_ROLE}: ${url ?? name}`);
      return url;
    }
    console.error(
      `Deploy of ${name} failed (attempt ${attempt}):\n${result.output.slice(-1500)}`,
    );
  }
  process.exit(1);
}

const storeUrl = deploy(built.name, { APP_ROLE: 'store' });
deploy(adminName, { APP_ROLE: 'admin', STORE_URL: storeUrl ?? '' });

// Retried, so a timed-out request is not reported as "missing secrets".
let secrets = { ok: false, output: '' };
for (let attempt = 1; attempt <= 3 && !secrets.ok; attempt++)
  secrets = wrangler([
    'secret',
    'list',
    '--name',
    adminName,
    '--format',
    'json',
  ]);
const missing = ['ADMIN_EMAILS', 'TOTP_ENCRYPTION_KEY'].filter(
  (name) => !secrets.output.includes(`"${name}"`),
);
if (!secrets.ok)
  console.warn(
    `\nCould not check the admin Worker's secrets. Check with:\n  npx wrangler secret list --name ${adminName}`,
  );
else if (missing.length)
  console.warn(
    `\nThe admin Worker is missing secrets: ${missing.join(', ')}. Nobody can sign in until they are set:\n` +
      missing
        .map((name) => `  npx wrangler secret put ${name} --name ${adminName}`)
        .join('\n'),
  );
