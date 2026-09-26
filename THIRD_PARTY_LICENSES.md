# Third-party software and assets

Checked on 2026-09-26 from `package.json` and `package-lock.json`. Each package's
full licence text is in its folder under `node_modules/`. Photos and brand
assets are covered in [MEDIA_SOURCES.md](MEDIA_SOURCES.md).

## Software used by the website

| Package | Version | Licence | Used for |
| --- | --- | --- | --- |
| react, react-dom, react-server-dom-webpack | 19.2.8 | MIT | User interface |
| vinext | 1.0.0-beta.5 | MIT | Framework (Next.js-style routing on Vite) |
| @base-ui/react | 1.7.0 | MIT | Dialogs and drawers |
| drizzle-orm | 0.45.2 | Apache-2.0 | Database queries |
| lucide-react | 1.31.0 | ISC | Icons |
| clsx | 2.1.1 | MIT | CSS class names |
| uqr | 0.1.3 | MIT | QR code for two-factor setup (admin) |

All other packages installed with them (about 200) use MIT, ISC, Apache-2.0,
BSD-2-Clause, BSD-3-Clause, 0BSD, MPL-2.0 or CC-BY-4.0.

## Build and development tools (not shipped to visitors)

Wrangler, Vite, @cloudflare/vite-plugin, @vitejs/plugin-react, @vitejs/plugin-rsc,
Tailwind CSS, TypeScript, drizzle-kit, oxlint, oxfmt, sharp and type
definitions: MIT, Apache-2.0 or "MIT OR Apache-2.0".

## Licences that need attention

| Licence | Packages | Where | Note |
| --- | --- | --- | --- |
| LGPL-3.0-or-later | `@img/sharp-libvips-*`, `@img/sharp-win32-*`, `@img/sharp-wasm32` (via sharp) | Dev only: `scripts/` image tools | Not shipped. If sharp is ever bundled into something you distribute, the LGPL terms for libvips apply. |
| MPL-2.0 | `lightningcss` (build), `satori`, `@resvg/resvg-wasm`, `@vercel/og` (installed with vinext) | Build tooling / framework | File-level copyleft: only changes to those files would have to be shared. We use them unmodified. |
| CC-BY-4.0 | `caniuse-lite` | Build tooling (browser support data) | Attribution: browser support data by caniuse.com (CC BY 4.0). |

No GPL, AGPL, SSPL, non-commercial or source-available licences were found.

## Fonts

| Font | Licence | How it is served |
| --- | --- | --- |
| Geist, Geist Mono (Vercel) | SIL Open Font License 1.1 | Downloaded at build time through `next/font/google` and served from this site (no requests to Google while browsing) |

## Icons and images

- Icons: Lucide (ISC), bundled.
- BLACKSHARK / BS Gaming logo and icons: supplied by the store owner.
- Product photos: see [MEDIA_SOURCES.md](MEDIA_SOURCES.md). **Usage rights are not
  confirmed** for the product photos; see the audit in
  [docs/legal-security-audit.md](docs/legal-security-audit.md).

## Trademarks

Product and brand names (for example AMD, Intel, NVIDIA, ASUS, Sony, Microsoft)
and game titles shown with FPS estimates (Fortnite, Call of Duty: Warzone,
Call of Duty: Black Ops 7) belong to their owners. They are used only to
identify products and games; no third-party logos are used as site branding.
