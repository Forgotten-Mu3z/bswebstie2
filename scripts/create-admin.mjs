// Gives an email access to the admin panel with a role.
//
//   npm run admin:create -- --email owner@example.com --name "Store owner" --remote
//
// Passwords and two-factor apps live in Supabase Auth, so this sets neither:
// invite the same email in the Supabase dashboard (Authentication > Users >
// Invite user); the invitation link opens /reset-password to choose a
// password, and the first sign-in sets up the authenticator app.
//
// Options: --local | --remote, --role OWNER|ADMIN|PRODUCT_MANAGER (default
// OWNER). Running it again signs the account out everywhere.
// The email must also be in the admin Worker's ADMIN_EMAILS secret (at most
// two addresses), or sign-in is refused.
import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
};
const email = option('email')?.trim().toLowerCase();
const name = option('name')?.trim() || email;
const role = (option('role') ?? 'OWNER').toUpperCase();
const target = args.includes('--remote')
  ? '--remote'
  : args.includes('--local')
    ? '--local'
    : null;

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  fail('Pass a valid --email.');
if (!target)
  fail('Pass --local (development database) or --remote (live database).');
if (!['OWNER', 'ADMIN', 'PRODUCT_MANAGER'].includes(role))
  fail('Role must be OWNER, ADMIN or PRODUCT_MANAGER.');

const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const now = Math.floor(Date.now() / 1000);
const sql = `
INSERT INTO users (id, email, display_name, created_at, updated_at)
VALUES (${q(randomUUID())}, ${q(email)}, ${q(name)}, ${now}, ${now})
ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name,
  suspended_at = NULL, updated_at = excluded.updated_at;
INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = ${q(email)} AND r.name = ${q(role)};
DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ${q(email)});
-- Also lifts this account's sign-in and code lockouts.
DELETE FROM login_failures WHERE key = ${q(`email:${email}`)}
  OR key = 'totp:' || (SELECT id FROM users WHERE email = ${q(email)});
`;

// Written to a temporary file for Wrangler, then deleted.
const dir = join('.wrangler', 'tmp');
mkdirSync(dir, { recursive: true });
const file = join(dir, `admin-${randomBytes(6).toString('hex')}.sql`);
writeFileSync(file, sql, { mode: 0o600 });
try {
  const extra =
    target === '--local'
      ? ['--persist-to', process.env.LOCAL_STATE_DIR || '.wrangler/state']
      : [];
  // Wrangler's own entry point, run with Node, so no shell parses arguments.
  const result = spawnSync(
    process.execPath,
    [
      join('node_modules', 'wrangler', 'bin', 'wrangler.js'),
      'd1',
      'execute',
      'DB',
      target,
      ...extra,
      '--file',
      file,
      '--yes',
    ],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
  if (result.status !== 0) fail('Wrangler could not update the database.');
  console.log(`
Admin access ready: ${email} (${role})

Next, in the Supabase dashboard: Authentication > Users > Invite user, and
invite ${email}. The email link opens the admin site to choose a password;
the first sign-in then sets up an authenticator app.
Check that ${email} is in the admin Worker's ADMIN_EMAILS secret.`);
} finally {
  rmSync(file, { force: true });
}
