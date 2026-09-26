# Security

## Reporting a problem

Tell the store owner privately. Do not open a public GitHub issue for a security problem.

## Where the protections are

| Concern | Code |
| --- | --- |
| Store vs admin separation, rate limits | `proxy.ts`, `server/security/site.ts`, `server/security/request-limits.ts` |
| Sign-in, 2FA, password change and reset | `app/api/auth/*`, `server/security/{supabase,two-factor,seal,lockout}.ts` |
| Sessions and cookies | `server/security/sessions.ts` |
| Admin access checks (pages and API) | `server/security/admin.ts` (`requireAdminPage`, `adminRoute`) |
| Input validation | `server/catalog/validation.ts`, `server/security/http.ts` |
| Audit trail | `server/security/audit.ts` |
| Security headers, Content-Security-Policy | `next.config.ts`, `public/_headers` |
| Personal data held, and for how long | `docs/privacy-data-inventory.md` |
| Open audit items | `docs/legal-security-audit.md` |

## Where secrets live

Nothing secret is in this repository. These live only in Cloudflare:

| Secret | Where | Used for |
| --- | --- | --- |
| `ADMIN_EMAILS` | Admin Worker secret | The (at most two) emails allowed to sign in |
| `TOTP_ENCRYPTION_KEY` | Admin Worker secret | Encrypts the Supabase token between the password and code steps |
| Supabase login | Your Supabase account | Admin passwords, two-factor apps, reset emails |
| Cloudflare login / API tokens | Your Cloudflare account | Deploying, database, storage |

`.env.deploy` (git-ignored, on the deploying computer) holds the admin Worker's name, which is
also its address, and the Supabase project URL and publishable key. The publishable key is not
a secret (Supabase designs it to be public); the secret (service role) key is never used.

## If something goes wrong

Work through these in order, and note what you saw and when.

**An admin password may be known to someone else**
1. Use "Forgot password?" on the sign-in page (or Supabase dashboard → Authentication → Users →
   the user → Send password recovery) and choose a new one. That signs out every device.
2. Check "Recent activity" on the admin overview for changes you did not make.

**A phone with the authenticator app is lost or stolen, or the account is locked**
1. In the Supabase dashboard → SQL Editor, remove the old app:
   `delete from auth.mfa_factors where user_id = (select id from auth.users where email = '<email>');`
2. `npm run admin:create -- --email <email> --remote` signs the account out here and lifts its
   lockouts.
3. Sign in and scan the new QR code on the new phone.

**An admin email account is taken over**
1. Remove the email from the allowlist first; its sessions end immediately:
   `npx wrangler secret put ADMIN_EMAILS --name <admin-worker-name>` (enter only the safe email).
2. Secure the email account (reset links go there), then add it back and reset as above.

**The encryption key may have leaked (`TOTP_ENCRYPTION_KEY`)**
Set a new key; sign-ins in progress simply start again:
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" | npx wrangler secret put TOTP_ENCRYPTION_KEY --name <admin-worker-name>`

**The Supabase account may be compromised**
1. Change the Supabase password and turn on two-factor sign-in for the Supabase account.
2. Remove team members you do not recognise; reset every admin password as above.

**Cloudflare account access may be compromised**
1. Change the Cloudflare password and turn on two-factor sign-in for the Cloudflare account.
2. Revoke API tokens you do not recognise; run `npx wrangler logout` on computers you no
   longer use.
3. Rotate the encryption key as above, then reset all admin passwords.

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
