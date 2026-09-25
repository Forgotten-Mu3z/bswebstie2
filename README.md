# BLACKSHARK — gaming store (v2)

Storefront, PC builder and catalog admin for BLACKSHARK, a gaming PC and parts store in Oman.
Version 2 is a full redesign ("spec sheet" look: dark, precise, monospace details) on the same
security model as version 1, with the code reorganised to be smaller and easier to follow.

Built with React 19, [Vinext](https://github.com/cloudflare/vinext) (Next.js-style routing on Vite),
TypeScript, Tailwind CSS 4 and Drizzle ORM. Runs on Cloudflare Workers with **D1** (database) and
**R2** (uploaded photos).

## What it does

- **Store:** home page, 6 categories with part-type chips, filters (brand, price, stock, sale),
  sorting, a search palette with live suggestions (`Ctrl K` or `/`), product spec sheets and a
  deals page that only lists real sale prices.
- **Ordering on WhatsApp:** there is no cart or online checkout. Every product has an
  "Order on WhatsApp" button that lets the shopper pick Munir or Bassam and opens WhatsApp with
  the order already written (product, quantity, SKU, website price and link).
- **Saved items** kept on the shopper's device. Prices and stock refresh on every visit.
- **PC builder:** 8 core steps plus 7 optional extras (second drive, case fans, Wi-Fi, capture
  card, build extras, monitor, gaming gear). Each step only lists parts that fit what is already
  chosen (socket, memory type, board size, power supply). The build lives in the link, so it can
  be shared or sent on WhatsApp and reopened later; parts in a link that do not fit their step
  are ignored.
- **Estimated FPS** for Fortnite, Call of Duty: Warzone and Call of Duty: Black Ops 7 at 1080p and
  1440p, shown on gaming PCs, graphics cards and in the builder once a graphics card is chosen
  (`lib/fps.ts`). The numbers are rough ranges from a relative score per graphics card and a
  processor tier, and the page always says they are estimates.
- **Products imported from Instagram posts** (`npm run instagram:products`) can hide their stock
  count ("Hide the stock count" in the editor); the product page links back to the source post.
- **Admin site** (a separate address): overview with counts, low stock and activity, and product
  management with photo upload.

Live store: https://bsgaming.kbdh1243-2.workers.dev (the admin address is kept out of this repository).

Prices are stored as whole **baisa** (1 OMR = 1000 baisa) and shown as `OMR 1,234.500`.

## Project layout

```
app/                 routes (store pages in app/(store), admin in app/admin, sign-in, security)
app/api/             JSON and form endpoints (public: search, products, photos; admin; auth)
components/store     storefront UI (header, search, WhatsApp ordering, saved items, filters)
components/builder   the PC builder
components/admin     admin UI (shell, product manager and editor, sign-in card)
components/ui        shared pieces (buttons, dialogs, price, stock, notices)
lib/                 code shared by server and browser (catalog vocabulary, builder rules, prices)
server/catalog       database queries and validation
server/security      everything about access: sessions, 2FA, lockouts, limits, audit, headers
db/, drizzle/        schema and migrations (0001 loads the 50-product catalog)
proxy.ts             runs first on every request: rate limits and store/admin separation
```

## SEO

- Every public page has its own 50-60 character title, a 140-160 character description, a
  self-referencing canonical, Open Graph and Twitter tags (`lib/seo.ts`), all in `<head>`.
- Share images are 1200x630: `public/og/default.png` and one per product photo in
  `public/og/products/`. Regenerate them and the favicon set with `npm run brand:assets`.
- JSON-LD: Organization and WebSite (home), Product and BreadcrumbList (products),
  BreadcrumbList and ItemList (categories, deals).
- `robots.txt` allows search engines and AI crawlers, `sitemap.xml` lists every public page with
  `lastmod`, and `/llms.txt` and `/llms-full.txt` summarise the store for language models.
- Once a domain is connected, set `SITE_URL` in `wrangler.jsonc` `vars`: canonicals, the sitemap
  and share links use it, and the store permanently redirects any other address (such as
  `*.workers.dev`) to it.

## Local development

Needs Node.js 22.13+.

```bash
npm install
npm run db:migrate:local
npm run admin:create -- --email you@example.com --name "Your name" --local
npm run dev
```

`npm run dev` serves the store. The admin only exists when the Worker runs with `APP_ROLE=admin`,
`ADMIN_EMAILS` and `TOTP_ENCRYPTION_KEY` set (see `.env.example`).

**Windows:** paths are limited to 260 characters. If the project folder is deep, point local data
at a short folder: `$env:LOCAL_STATE_DIR = "C:\bsdata"` and pass `--persist-to C:\bsdata` to
Wrangler's D1 commands.

## Deploying (Cloudflare)

One build becomes two Workers (`scripts/deploy.mjs`):

- **Store** (`bsgaming`, `APP_ROLE=store`): the public shop. Admin paths answer 404.
- **Admin** (`APP_ROLE=admin`): only the admin, sign-in and security pages. Its Worker name, which
  is also its address, comes from the git-ignored `.env.deploy`, so it is not in this repository.

First time:

```bash
npx wrangler login
npx wrangler d1 create bsgaming            # put the printed database_id in wrangler.jsonc
npm run db:migrate:remote
echo ADMIN_WORKER_NAME=<hard-to-guess-name> > .env.deploy
npm run deploy                             # or deploy:no-r2 until R2 is enabled
npx wrangler secret put ADMIN_EMAILS --name <admin-worker-name>
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" | npx wrangler secret put TOTP_ENCRYPTION_KEY --name <admin-worker-name>
npm run admin:create -- --email owner@example.com --name "Store owner" --remote
```

The key is trimmed before use, so a line break added by the shell is harmless.

`admin:create` prints a one-time password. At first sign-in the person scans a QR code with an
authenticator app, then must choose their own password.

**R2** must be enabled once in the Cloudflare dashboard (free up to 10 GB, but Cloudflare asks for
a payment method), then `npx wrangler r2 bucket create bsgaming-media`. Until then use
`npm run deploy:no-r2`; everything works except photo uploads, which explain that storage is off.

Links, the sitemap and builder links follow the address the visitor used until `SITE_URL` is set
(see SEO above).

## Security

Summary (details and incident steps in [SECURITY.md](SECURITY.md)):

- Separate admin Worker and address; the store has no admin routes at all.
- At most **two** admin emails (`ADMIN_EMAILS` secret). Removing one ends its sessions at once.
- Password **and** authenticator code at every sign-in. Codes cannot be reused; secrets are
  encrypted at rest.
- `__Host-` session cookie: `HttpOnly`, `Secure`, `SameSite=Strict`; only a hash is stored.
  Password-only sessions last 10 minutes and can only finish 2FA; full sessions 12 hours.
- Password rules checked on the server; temporary passwords must be changed; changing a
  password signs out every other device.
- Lockouts (5 wrong passwords, 5 wrong codes, 20 failures per IP in 15 minutes) and per-IP
  request limits on every endpoint.
- Every admin request checks the session and role permissions on the server; writes must come
  from the same origin. Edits use versions so two people cannot overwrite each other.
- Every product and photo change is written to an audit log in the same transaction.
- Uploads: JPG, PNG, WebP or AVIF, max 5 MB, checked by file signature, random names.
- Security headers on every response; error pages never show details.

## Product photos

Photos are in `public/products/` and listed in `scripts/product-image-manifest.json`.
**Their usage rights are not confirmed yet**; see [MEDIA_SOURCES.md](MEDIA_SOURCES.md)
(`npm run media:record` regenerates it). The four generic BLACKSHARK listings show a
"photo needed" placeholder until real photos are uploaded.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

## Not included yet

Online checkout and payments (orders are taken on WhatsApp), customer accounts, Arabic interface, email confirmation for
password changes (needs a domain for sending email), and legal pages (terms, privacy,
refunds). Legal text must come from, or be approved by, the business owner.
