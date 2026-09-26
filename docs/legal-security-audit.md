# Legal, privacy and security audit

Date: 2026-09-26. Scope: the BLACKSHARK v2 repository (`bs2`), the live store
and admin Workers, and the Supabase project used for staff sign-in.

This audit reduces avoidable risk; it does not make the website "compliant" or
immune from claims. The policy pages were drafted from what the code does, not
by a lawyer, and must be reviewed for Oman (see E).

## What the site is

| Item | Finding |
| --- | --- |
| Framework | Vinext 1.0.0-beta.5 (Next.js-style app router on Vite 8), React 19.2.8, TypeScript, Tailwind CSS 4 |
| Backend | Vinext route handlers on Cloudflare Workers; two Workers from one build (store, admin) |
| Database | Cloudflare D1 (`bsgaming`) through Drizzle ORM |
| Authentication | Staff only: Supabase Auth (password + TOTP) and a site session cookie. No customer accounts |
| Payments | None on the website. Orders and payment are agreed on WhatsApp |
| Analytics, pixels, ads, error reporting, CAPTCHA | None |
| Email / SMS | Supabase built-in email for staff password resets only. No SMS |
| File uploads | Staff product photos to R2 (R2 not enabled yet: uploads switched off) |
| CDN / hosting | Cloudflare Workers and static assets |
| Third-party APIs | Supabase Auth REST (server-side only). Links to api.whatsapp.com and instagram.com |
| Discord, Minecraft, Tebex, social login | None |
| Browser storage | No cookies for shoppers. localStorage `bsg-wishlist-v1`, `bsg-build-v1`. Staff cookie `__Host-bsg_admin` |
| User-generated content, contact/newsletter/checkout forms, profiles | None for shoppers |
| Admin / staff dashboard | Yes: separate Worker and address, roles OWNER / ADMIN / PRODUCT_MANAGER |
| Client-side secrets | None found. The Supabase publishable key is a server-side variable (and public by design) |
| External images and fonts | None: product photos and Geist fonts are served from the site |
| Downloadable files | None (besides `/llms.txt`, `/llms-full.txt`, `/sitemap.xml`) |
| Logs with personal data | Staff audit log and failed sign-in records hold IP addresses (see I) |

## A. What was found

1. There were no Terms, Privacy, Refund or Cookie pages and no contact page;
   the footer only listed WhatsApp numbers.
2. The Content-Security-Policy only set `frame-ancestors`, `base-uri`,
   `form-action` and `object-src`; scripts, images and connections were not
   limited to the site's own origin.
3. Failed sign-in records (with IP addresses) were only deleted when another
   failure happened, so they could stay indefinitely.
4. The store wrote an empty saved-items list (`[]`) and empty builds to
   localStorage for every visitor, even those who never saved anything.
5. `npm audit --omit=dev`: 3 "high" advisories, all in framework
   dependencies (see G).
6. Product photos have no confirmed usage rights (already recorded in
   `MEDIA_SOURCES.md`).
7. Supabase project: new sign-ups are still allowed and the redirect URL for
   reset emails is not set (dashboard settings; see D).
8. No secrets in tracked files or git history; `.env`, `.env.deploy`,
   `.dev.vars` and `.env.local` are git-ignored.

## B. What was changed

- **Legal pages** (store only; 404 on the admin site): `/terms`, `/privacy`,
  `/refunds`, `/cookies`, `/contact`, `/legal`. Shared layout
  `components/legal/legal-page.tsx` (breadcrumb, heading, "Last updated" and
  version, contents list, related policies, back link), readable text styles
  (`.legal-prose` in `app/globals.css`), SEO titles and descriptions,
  breadcrumb JSON-LD, listed in the sitemap and `/llms.txt`.
- **Central business config** `lib/business.ts`: trading name and country
  (known), everything else null until the owner supplies it. Pages leave out
  unknown details instead of inventing them. `npm run deploy` lists the
  missing values.
- **Document versions** `lib/legal.ts` (date = version, shown on each page).
- **Footer**: links to Terms, Privacy, Returns & refunds, Cookies, Contact;
  copyright year generated automatically, name from the config.
- **Order dialog** (WhatsApp chooser): states that prices and stock are
  confirmed in the chat before paying and that WhatsApp shares the shopper's
  name and number, with links to Terms, Returns and Privacy.
- **Cookies page**: lists every storage key and the staff cookie, and has a
  button that clears everything the store stored in the browser.
- **Security**: full CSP (`default-src 'self'` and friends, documented in
  `next.config.ts`); failed sign-in records purged on every check.
- **Data minimisation**: saved items and builds are only stored once used;
  storage key names centralised in `lib/storage-keys.ts`.
- **Docs**: `docs/privacy-data-inventory.md`, this file,
  `THIRD_PARTY_LICENSES.md`; README and SECURITY.md updated.

## C. Important remaining risks

1. Draft legal documents: not reviewed by a lawyer (E).
2. Product photos without confirmed rights (K).
3. Missing business details: no legal name, CR number, address or email is
   published yet, which Oman consumer rules may require for online sellers
   (TODO_LEGAL_REVIEW).
4. WhatsApp orders: the price in the pre-filled message can be edited by the
   customer. Staff must always confirm prices from the admin panel.
5. Staff phones hold customer chats: screen lock and WhatsApp two-step
   verification are the only protection (owner process).
6. Framework advisories not yet patched (G).
7. Staff audit log has no retention period (I).

## D. Information the owner still needs to provide

See the checklist at the end.

## E. Manual / legal review required

- All four policies (TODO_LEGAL_REVIEW comments in each page file).
- Oman Personal Data Protection Law: legal bases, cross-border transfers
  (Cloudflare worldwide, Supabase Japan, WhatsApp/Meta), data-subject rights wording.
- Oman Consumer Protection Law: returns, warranty, faulty goods, exceptions,
  seller identification requirements.
- Liability wording in the Terms.
- Governing law and disputes (`BUSINESS.governingLaw`).
- Minimum age / parental consent for orders.
- VAT statement on prices.
- Record-retention periods (accountant).

## F. Security issues fixed

| Issue | Fix |
| --- | --- |
| Weak CSP (no script/image/connect limits) | `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; manifest-src 'self'; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` |
| Sign-in failure records with IPs kept indefinitely | Purged (older than a day) on every lock check and failure |
| Empty browser-storage entries written for every visitor | Only written when the shopper saves something |

Checked and already sound (covered by the local test suites):
parameterised SQL (no string-built queries with user input); output escaping
and safe JSON-LD; same-origin checks on every form and JSON write (CSRF);
server-side role checks on every admin route (no client-only authorization);
path traversal and open-redirect tests; new session token after 2FA (no
fixation); `__Host-` HttpOnly Secure SameSite=Strict cookie with only a hash
stored; rate limits on every endpoint and lockouts; 2FA code replay guard;
upload checks by file signature and size; error pages without stack traces or
internals; admin on a separate Worker with `noindex` and no store routes.

## G. Security issues requiring further work

1. **Dependency advisories** (`npm audit --omit=dev`):
   - `image-size` (denial of service in JXL/HEIF/ICNS parsers), pulled in by
     `vinext`. vinext uses it only at build time on the site's own images, so
     the live risk is low. Fix: vinext 1.0.0-beta.12.
   - `vite` / `launch-editor`: affect the local dev server on Windows only.
     Fix: vite 8.3.1.
   Not upgraded here: vinext is a beta framework and seven betas is a real
   change. Upgrade in its own change and run every test suite.
2. `'unsafe-inline'` in `script-src`: the framework writes inline hydration
   scripts and has no nonce support. Revisit if vinext adds nonces.
3. Supabase: turn off sign-ups; set Site URL / redirect URL; consider custom
   SMTP (built-in email is for testing and limited to 2 an hour).
4. Cloudflare: confirm Workers Logs / Logpush settings and retention.
5. `security.txt` is not published: there is no security contact email yet.
6. Staff audit log retention (I).

## H. Third-party services

| Service | Purpose | Data it receives |
| --- | --- | --- |
| Cloudflare (Workers, D1, static assets, rate limiting) | Hosting, database, security | All requests (IP, user agent, URL); catalog and staff data |
| Supabase (project in ap-northeast-1) | Staff sign-in, 2FA, reset emails | Staff email, password, 2FA codes (server-to-server) |
| WhatsApp (Meta) | Orders and support | What the shopper sends; the pre-filled order text |
| Instagram (Meta) | Links only | Nothing unless the visitor opens a link |
| GitHub | Code hosting | Source code (no secrets) |

## I. Personal data collected

Full list in [privacy-data-inventory.md](privacy-data-inventory.md). Stored by
the system: staff email, name and role; hashed session tokens; sealed pending
sign-in state (10 minutes); failed sign-in records with IP (about a day);
staff audit log with IP (no retention period yet). Shoppers: nothing stored
server-side; saved items and builds in their own browser; chats in WhatsApp.

## J. Cookies and trackers

| Name | Type | Category | Where | Lifetime |
| --- | --- | --- | --- | --- |
| `__Host-bsg_admin` | Cookie (HttpOnly, Secure, SameSite=Strict) | Strictly necessary (authentication) | Admin site only | 10 min pending / 12 h |
| `bsg-wishlist-v1` | localStorage | Strictly necessary for a requested feature | Store | Until cleared |
| `bsg-build-v1` | localStorage | Strictly necessary for a requested feature | Store | Until cleared |

No analytics, marketing, advertising or third-party cookies or trackers, so
no consent banner or "Cookie settings" link: there is nothing optional to
turn on or off. If an optional tracker is ever added, it must be loaded only
after consent, from one central place, with its origin added to the CSP.

## K. Intellectual-property concerns

1. **Product photos (133)**: usage rights not confirmed (`MEDIA_SOURCES.md`).
   Many look like manufacturer or distributor images, and Instagram post
   images may include third-party logos. Confirm rights or replace.
2. Brand names, product names and game titles are used descriptively; no
   third-party logo is used as site branding. The Terms say products' brands
   belong to their owners and do not endorse the store.
3. No copied legal text, competitor branding, template watermarks or other
   companies' names as branding were found. The BLACKSHARK / BS Gaming logo
   was supplied by the owner.
4. Product descriptions: written for this project or taken from the store's
   own Instagram captions; specifications follow manufacturers' data.

## L. Dependency and licence concerns

See [THIRD_PARTY_LICENSES.md](../THIRD_PARTY_LICENSES.md). No GPL, AGPL, SSPL
or non-commercial licences. LGPL only in dev tooling (sharp/libvips), MPL-2.0
in build/framework packages used unmodified, CC-BY-4.0 data in `caniuse-lite`.
No obviously abandoned packages; vinext is pre-1.0 (beta), which is the main
maintenance risk.

## M. Production checklist

- [ ] Fill in `lib/business.ts` (legal name, CR number, address, email,
      payment methods, delivery, return period if any)
- [ ] Legal review of `/terms`, `/privacy`, `/refunds`, `/cookies` for Oman;
      then set `governingLaw` and update the dates in `lib/legal.ts`
- [ ] Confirm product photo rights or replace the photos
- [ ] Supabase: turn off sign-ups, set Site URL and redirect URL, add the owner
      as a team member, consider custom SMTP
- [ ] Decide retention for the staff audit log and for WhatsApp order records
- [ ] Confirm Cloudflare log settings
- [ ] Upgrade vinext and vite in a separate, fully tested change
- [ ] Add a security email and publish `/.well-known/security.txt`
- [ ] Staff: phone screen lock and WhatsApp two-step verification
- [ ] Custom domain; then set `SITE_URL`
