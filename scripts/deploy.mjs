// Deploys one build as two Workers:
//   store  the public shop (APP_ROLE=store; admin paths answer 404)
//   admin  the admin panel only (APP_ROLE=admin), on its own address
//
// Run after `vinext build` (`npm run deploy` does both).
// The admin Worker's name and its Supabase project (SUPABASE_URL,
// SUPABASE_PUBLISHABLE_KEY, uploaded as encrypted secrets) come from the
// environment or the git-ignored .env.deploy file.
// STORE_DOMAIN and ADMIN_DOMAIN (optional, same places) give each site its own
// address, e.g. shop.example.com, as a Cloudflare custom domain on a zone in
// this account.
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

// The admin site never shows social share images, so its static files leave
// them out instead of uploading them twice.
function adminAssets() {
  const dir = join('dist', 'admin-client');
  rmSync(dir, { recursive: true, force: true });
  cpSync(join('dist', 'client'), dir, {
    recursive: true,
    filter: (source) => !/[\\/]client[\\/]og([\\/]|$)/.test(source),
  });
  return '../admin-client';
}

function deploy(name, vars, domain, secrets) {
  const config = { ...built, name, vars: { ...built.vars, ...vars } };
  // Cloudflare creates the DNS record and certificate for a custom domain.
  // With routes set, Wrangler turns the workers.dev address off unless asked:
  // keep it, so old links still arrive (and redirect to the domain).
  if (domain) {
    config.routes = [{ pattern: domain, custom_domain: true }];
    config.workers_dev = true;
  }
  if (vars.APP_ROLE === 'admin')
    config.assets = { ...built.assets, directory: adminAssets() };
  if (noR2) delete config.r2_buckets;
  // Written next to the built config so its relative paths still resolve.
  const file = join('dist', 'server', `wrangler.${vars.APP_ROLE}.json`);
  writeFileSync(file, JSON.stringify(config, null, 2));
  // Secrets go up encrypted with the same version (never as plain vars). The
  // file holding them exists only during the upload, readable by this user.
  const secretsFile = join('dist', 'server', `.secrets-${vars.APP_ROLE}.json`);
  const args = ['deploy', '--config', file];
  if (secrets) args.push('--secrets-file', secretsFile);
  for (let attempt = 1; attempt <= 3; attempt++) {
    let result;
    try {
      if (secrets)
        writeFileSync(secretsFile, JSON.stringify(secrets), { mode: 0o600 });
      result = wrangler(args);
    } finally {
      rmSync(secretsFile, { force: true });
    }
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

const setting = (name) => process.env[name] ?? localEnv[name] ?? '';
const supabase = {
  SUPABASE_URL: setting('SUPABASE_URL'),
  SUPABASE_PUBLISHABLE_KEY: setting('SUPABASE_PUBLISHABLE_KEY'),
};
if (!supabase.SUPABASE_URL || !supabase.SUPABASE_PUBLISHABLE_KEY) {
  console.error(
    'Admin sign-in needs Supabase. Add to .env.deploy:\n' +
      '  SUPABASE_URL=https://<project>.supabase.co\n' +
      '  SUPABASE_PUBLISHABLE_KEY=<publishable key>',
  );
  process.exit(1);
}

const domain = (name) => {
  const host = setting(name).trim().toLowerCase();
  if (host && !/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(host)) {
    console.error(
      `${name} must be a host name like shop.example.com, not "${host}".`,
    );
    process.exit(1);
  }
  return host;
};
const storeDomain = domain('STORE_DOMAIN');
const adminDomain = domain('ADMIN_DOMAIN');
// Three tries, so one slow or failed request does not count as "down".
let lastProblem = '';
const answers = async (url) => {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
      });
      if (response.status === 200) return true;
      lastProblem = `HTTP ${response.status}`;
    } catch (error) {
      lastProblem = error?.cause?.code ?? error?.message ?? String(error);
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  return false;
};

// Deploys one site, on its custom domain when one is set. SITE_URL makes every
// other address (such as *.workers.dev) redirect to the domain, so it is only
// set once the domain answers: a domain that failed to attach never takes the
// site offline. `probe` is a path that answers 200 on that site.
async function deploySite(name, vars, host, probe, secrets) {
  const site = host ? `https://${host}` : '';
  let url;
  let attachedFirst = false;
  if (site && !(await answers(site + probe))) {
    url = deploy(name, vars, host, secrets);
    attachedFirst = true;
    console.log(`Waiting for ${host} to come online...`);
    for (let tries = 0; tries < 8; tries++) {
      if (await answers(site + probe)) break;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  const live = Boolean(site) && (await answers(site + probe));
  if (site && !live)
    console.warn(
      `\n${host} is not answering from this computer yet (${lastProblem}), so the old address does not redirect to it. Deploy again once it works.`,
    );
  // Already deployed above with the domain but no redirect: only redeploy to
  // add the redirect once the domain works.
  if (!attachedFirst || live)
    url =
      deploy(
        name,
        { ...vars, ...(live ? { SITE_URL: site } : {}) },
        host,
        secrets,
      ) ?? url;
  if (live) console.log(`${vars.APP_ROLE} address: ${site}`);
  return live ? site : url;
}

const storeAddress = await deploySite(
  built.name,
  { APP_ROLE: 'store' },
  storeDomain,
  '/robots.txt',
);
// The Supabase settings are secrets, not plain vars, so they never show in
// the Cloudflare dashboard or in the deployed configuration.
await deploySite(
  adminName,
  { APP_ROLE: 'admin', STORE_URL: storeAddress ?? '' },
  adminDomain,
  '/sign-in',
  supabase,
);

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
const missing = [
  'ADMIN_EMAILS',
  'TOTP_ENCRYPTION_KEY',
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
].filter((name) => !secrets.output.includes(`"${name}"`));
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

// Business details the policy pages leave out until the owner fills them in
// (a null followed by a comment was left out on purpose).
const unsetDetails = [
  ...readFileSync(join('lib', 'business.ts'), 'utf8').matchAll(
    /^ {2}(\w+): null,$/gm,
  ),
].map((match) => match[1]);
if (unsetDetails.length)
  console.warn(
    `\nNot yet filled in lib/business.ts (the policy pages leave these out): ${unsetDetails.join(', ')}`,
  );
