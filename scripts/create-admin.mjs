// Creates an admin account, or resets one, with a one-time temporary password.
//
//   npm run admin:create -- --email owner@example.com --name "Store owner" --remote
//   npm run admin:create -- --email owner@example.com --remote --reset-2fa
//
// The temporary password is printed once. At first sign-in the person sets up
// two-factor sign-in, then must choose their own password (checked on the
// server). A reset always signs the account out everywhere.
//
// Options: --local | --remote, --role OWNER|ADMIN|PRODUCT_MANAGER (default
// OWNER), --reset-2fa (for a lost phone).
// The email must also be in the admin Worker's ADMIN_EMAILS secret (at most
// two addresses), or sign-in is refused.
import { spawnSync } from 'node:child_process';
import { pbkdf2Sync, randomBytes, randomInt, randomUUID } from 'node:crypto';
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
const resetTwoFactor = args.includes('--reset-2fa');
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

// 20 characters with at least one from each group (look-alikes left out).
function temporaryPassword() {
  const groups = [
    'abcdefghjkmnpqrstuvwxyz',
    'ABCDEFGHJKMNPQRSTUVWXYZ',
    '23456789',
    '!#%+?@',
  ];
  const all = groups.join('');
  const chars = groups.map((group) => group[randomInt(group.length)]);
  while (chars.length < 20) chars.push(all[randomInt(all.length)]);
  for (let index = chars.length - 1; index > 0; index--) {
    const swap = randomInt(index + 1);
    [chars[index], chars[swap]] = [chars[swap], chars[index]];
  }
  return chars.join('');
}

const password = temporaryPassword();
// Same format and cost as server/security/passwords.ts.
const iterations = 100_000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
const stored = `pbkdf2_sha256$${iterations}$${salt.toString('base64')}$${hash.toString('base64')}`;

const q = (value) => `'${String(value).replaceAll("'", "''")}'`;
const now = Math.floor(Date.now() / 1000);
const twoFactorReset = resetTwoFactor
  ? ', totp_secret = NULL, totp_pending_secret = NULL, totp_last_step = NULL'
  : '';
const sql = `
INSERT INTO users (id, email, display_name, password_hash, must_change_password, created_at, updated_at)
VALUES (${q(randomUUID())}, ${q(email)}, ${q(name)}, ${q(stored)}, 1, ${now}, ${now})
ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name, password_hash = excluded.password_hash,
  must_change_password = 1, suspended_at = NULL, updated_at = excluded.updated_at${twoFactorReset};
INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r WHERE u.email = ${q(email)} AND r.name = ${q(role)};
DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = ${q(email)});
-- A reset also lifts this account's sign-in and code lockouts.
DELETE FROM login_failures WHERE key = ${q(`email:${email}`)}
  OR key = 'totp:' || (SELECT id FROM users WHERE email = ${q(email)});
`;

// The SQL holds a password hash: written with owner-only access, then deleted.
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
Account ready: ${email} (${role})
Temporary password (shown once): ${password}

At first sign-in: set up an authenticator app, then choose a new password.${
    resetTwoFactor ? '\nTwo-factor sign-in was reset.' : ''
  }
Check that ${email} is in the admin Worker's ADMIN_EMAILS secret.`);
} finally {
  rmSync(file, { force: true });
}
