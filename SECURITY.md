# Security

## Reporting a problem

Tell the store owner privately. Do not open a public GitHub issue for a security problem.

## Where the protections are

| Concern | Code |
| --- | --- |
| Store vs admin separation, rate limits | `proxy.ts`, `server/security/site.ts`, `server/security/request-limits.ts` |
| Sign-in, 2FA, password change | `app/api/auth/*`, `server/security/{passwords,totp,two-factor,lockout}.ts` |
| Sessions and cookies | `server/security/sessions.ts` |
| Admin access checks (pages and API) | `server/security/admin.ts` (`requireAdminPage`, `adminRoute`) |
| Input validation | `server/catalog/validation.ts`, `server/security/http.ts` |
| Audit trail | `server/security/audit.ts` |
| Security headers | `next.config.ts`, `public/_headers` |

## Where secrets live

Nothing secret is in this repository. These live only in Cloudflare:

| Secret | Where | Used for |
| --- | --- | --- |
| `ADMIN_EMAILS` | Admin Worker secret | The (at most two) emails allowed to sign in |
| `TOTP_ENCRYPTION_KEY` | Admin Worker secret | Encrypts two-factor secrets in the database |
| Cloudflare login / API tokens | Your Cloudflare account | Deploying, database, storage |

`.env.deploy` (git-ignored, on the deploying computer) holds the admin Worker's name, which is
also its address.

## If something goes wrong

Work through these in order, and note what you saw and when.

**An admin password may be known to someone else**
1. Reset it: `npm run admin:create -- --email <email> --remote`. This signs the account out
   everywhere and prints a new one-time password.
2. Check "Recent activity" on the admin overview for changes you did not make.

**A phone with the authenticator app is lost or stolen, or the account is locked**
1. `npm run admin:create -- --email <email> --remote --reset-2fa` resets the password and
   two-factor sign-in, and lifts that account's lockouts.
2. Sign in and scan the new QR code on the new phone.

**An admin email account is taken over**
1. Remove the email from the allowlist first; its sessions end immediately:
   `npx wrangler secret put ADMIN_EMAILS --name <admin-worker-name>` (enter only the safe email).
2. Secure the email account, then add it back and reset as above.

**The encryption key may have leaked (`TOTP_ENCRYPTION_KEY`)**
1. Set a new key:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" | npx wrangler secret put TOTP_ENCRYPTION_KEY --name <admin-worker-name>`
2. Reset two-factor for every admin with `--reset-2fa` (old secrets can no longer be read).

**Cloudflare account access may be compromised**
1. Change the Cloudflare password and turn on two-factor sign-in for the Cloudflare account.
2. Revoke API tokens you do not recognise; run `npx wrangler logout` on computers you no
   longer use.
3. Rotate both Worker secrets as above, then reset all admins.

**The admin address becomes known**
The address is not the protection; password, two-factor and the allowlist are. To change it
anyway: set a new `ADMIN_WORKER_NAME` in `.env.deploy`, redeploy, set the two secrets on the new
Worker, and delete the old Worker in the dashboard.

**Product data was changed or deleted**
Check the audit trail on the admin overview. D1 Time Travel can restore the database to any
point in the last 30 days: `npx wrangler d1 time-travel restore bsgaming --timestamp <time>`.

After any incident, find out how it happened and fix that. Decide with the business owner
whether anyone must be told; some laws require notice when personal data is exposed, so get
proper advice before contacting customers or authorities.
