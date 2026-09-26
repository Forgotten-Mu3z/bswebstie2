# Privacy data inventory

What personal data the BLACKSHARK website (v2) handles, based on the code as of
2026-09-26. Examples are made up; no customer data is recorded here. Keep this
file and `app/(store)/privacy/page.tsx` in step: when the code starts
collecting something new, update both.

**How the site works, in short:** a catalog with prices and a PC builder. There
are no customer accounts, no online payments, no contact or newsletter forms,
no analytics, no advertising and no third-party scripts. Orders happen on
WhatsApp. Only store staff sign in, on a separate admin site.

Legend: **Consent?** says whether consent may be needed (to be confirmed in the
legal review). "TODO" marks decisions only the owner, an accountant or a lawyer
can make.

---

## A. Shoppers on the website

### 1. IP address and request details

- **Example:** `203.0.113.7`, browser user agent, page URL, time
- **Why:** deliver pages; per-IP request limits (abuse, password guessing)
- **Source:** every request, automatically
- **Stored:** not in our database for shoppers. Workers Rate Limiting keeps a
  short-lived counter per `name:IP` key (`server/security/request-limits.ts`).
  Cloudflare may keep request logs; `wrangler.jsonc` does not turn on Workers
  Logs (TODO: confirm in the Cloudflare dashboard).
- **Access:** Cloudflare; the owner through the Cloudflare dashboard, if logs are on
- **Third party:** Cloudflare (hosting, worldwide network)
- **Retention:** rate-limit counters last about a minute; Cloudflare logs per
  Cloudflare's settings (TODO)
- **Required/optional:** required to use the site
- **Consent?:** no (needed to provide the service; security)
- **Deletion / access requests:** nothing to delete on our side; Cloudflare logs per its policies
- **Security:** never written to D1 for shoppers; not logged by our code

### 2. Search terms

- **Example:** `rtx 5070`
- **Why:** find matching products (`/api/search`, `/search`)
- **Source:** the search box
- **Stored:** not stored; used for one database query (parameterised) and dropped
- **Third party:** Cloudflare (as part of the request)
- **Required/optional:** optional
- **Consent?:** no
- **Security:** capped at 100 characters, wildcards escaped, SQL parameterised

### 3. Saved items

- **Example:** a list of product objects (id, name, price, stock, image path)
- **Why:** the shopper's "saved" list (heart button)
- **Source:** the shopper's own action
- **Stored:** browser localStorage key `bsg-wishlist-v1` (`lib/storage-keys.ts`),
  only while at least one item is saved
- **Access:** only the shopper's browser
- **Third party:** none. To refresh prices, product ids (not personal) are
  sent to `/api/products`
- **Retention:** until the shopper removes the items or clears storage
- **Required/optional:** optional
- **Consent?:** no (storage the shopper asked for; strictly necessary for the
  feature). TODO_LEGAL_REVIEW: confirm for Oman
- **Deletion:** remove items, or "Clear saved items and PC build" on `/cookies`

### 4. PC build in progress

- **Example:** `cpu=gcc-cpu-...&gpu=gcc-gpu-...`
- **Why:** keep the build while the shopper works on it; shareable link
- **Stored:** localStorage key `bsg-build-v1` (only while the build has parts)
  and the page address (`/build?...`)
- **Access:** the shopper; anyone they share the link with sees only the parts
- **Third party:** none (WhatsApp if the shopper sends the build)
- **Required/optional:** optional
- **Consent?:** no (as above)
- **Deletion:** "Start over" in the builder, or the button on `/cookies`

### 5. Pre-filled WhatsApp order message

- **Example:** product name, quantity, SKU, website price, product link
- **Why:** let the shopper order without typing
- **Source:** built in the browser (`components/store/order-button.tsx`)
- **Stored:** nowhere by us; it is placed in the `api.whatsapp.com` link the
  shopper opens, and only reaches us if the shopper sends it
- **Third party:** WhatsApp (Meta), when the link is opened
- **Required/optional:** optional
- **Security:** the price in the message is for reference only; staff must
  confirm the price from the admin panel, never from the message

## B. Shoppers on WhatsApp (outside the website, part of the business)

### 6. WhatsApp name, number, profile photo and messages

- **Example:** `+968 9XXX XXXX`, "Ahmed", photos of a faulty part, a delivery address
- **Why:** answer questions, confirm orders, arrange payment and delivery,
  after-sales and warranty
- **Source:** the shopper messages the store's WhatsApp numbers (`lib/contacts.ts`)
- **Stored:** in the staff members' WhatsApp accounts/phones
- **Access:** the named staff (see `lib/contacts.ts`)
- **Third party:** WhatsApp (Meta)
- **Retention:** TODO (owner, with an accountant for order records)
- **Required/optional:** needed to order
- **Consent?:** TODO_LEGAL_REVIEW (likely contract performance)
- **Deletion / access / correction:** on request to the store; some order and
  payment records may need to be kept (TODO: accountant)
- **Security:** staff phones should use a screen lock and WhatsApp two-step
  verification (TODO: owner)

### 7. Payment details

- **Example:** amount paid, method, bank transfer reference
- **Why:** take payment, refunds, accounting
- **Source:** agreed in the chat; the website takes no payments and no card data
- **Stored:** outside the website (TODO: owner's records)
- **Third party:** the shopper's bank or payment provider, if any
- **Retention:** TODO (accountant)

## C. Store staff (admin site only)

### 8. Staff email, display name, role

- **Example:** `owner@example.com`, "Store owner", OWNER
- **Why:** sign-in, permissions, audit trail
- **Source:** `npm run admin:create` (D1) and the Supabase dashboard
- **Stored:** D1 `users`, `user_roles`; Supabase Auth `auth.users`
- **Access:** the owner (Cloudflare and Supabase accounts)
- **Third party:** Supabase (project region ap-northeast-1, Japan)
- **Retention:** while the person is staff; delete when they leave (TODO: owner process)
- **Required:** yes, for staff
- **Allowlist:** at most two emails, `ADMIN_EMAILS` secret

### 9. Password

- **Why:** sign-in
- **Stored:** only in Supabase Auth (hashed by Supabase). Never stored or
  logged by our code; sent over HTTPS from the Worker to Supabase
- **Security:** rules in `lib/password-policy.ts` for changes and resets;
  lockouts after 5 wrong passwords

### 10. Authenticator app (TOTP) secret

- **Stored:** Supabase Auth (MFA factor). While a new app is being added, the
  secret is also kept for up to 10 minutes inside the sealed pending sign-in
  (see 12)
- **Security:** codes checked by Supabase; a code cannot be reused for 90
  seconds (hash in `users.last_code`, `last_code_at`)

### 11. Session cookie `__Host-bsg_admin`

- **Example:** random 32-byte token
- **Stored:** browser cookie (HttpOnly, Secure, SameSite=Strict, host-only);
  only its SHA-256 hash in D1 `sessions`
- **Retention:** 10 minutes (pending) / 12 hours (signed in); expired rows are
  deleted when a new session starts; all sessions end on password change or reset

### 12. Pending sign-in state

- **Content:** Supabase access token from the password step, factor id,
  authenticator setup key
- **Stored:** D1 `sessions.sign_in_state`, AES-GCM encrypted with
  `TOTP_ENCRYPTION_KEY`, bound to the user id
- **Retention:** until the code is accepted (then deleted and the Supabase
  session signed out) or 10 minutes

### 13. Failed sign-in records

- **Example:** keys `email:owner@example.com`, `ip:203.0.113.7`, `totp:<user id>`
- **Why:** lockouts (5 per account, 5 per code, 20 per IP in 15 minutes)
- **Stored:** D1 `login_failures`
- **Retention:** rows older than a day are deleted on every sign-in check and
  failure (`server/security/lockout.ts`)

### 14. Staff activity (audit) log

- **Content:** staff user id, action (sign-in, 2FA on, password change/reset,
  product create/edit/delete, photo upload/delete), product values before and
  after, IP address, time
- **Why:** accountability for catalog changes and account events
- **Stored:** D1 `audit_logs`; shown on the admin overview
- **Retention:** no automatic deletion yet (TODO: owner decides a period)
- **Security:** never contains passwords, tokens or secrets (`server/security/audit.ts`)

### 15. Password-reset emails

- **Sent by:** Supabase's built-in email service, to the staff email only
  (members of the Supabase team; at most 2 per hour)
- **Content:** a one-time link to `/reset-password` on the admin site

## D. Not collected (verified in the code on 2026-09-26)

Customer accounts, names or addresses on the website; payment card data;
dates of birth or age; location or geolocation; device or browser
fingerprints; analytics events; advertising identifiers; marketing consent or
newsletter sign-ups; uploaded files from shoppers; contact-form messages;
Discord, Minecraft or social-login identifiers.

## E. Where the data lives

| System | What | Region |
| --- | --- | --- |
| Cloudflare Workers + D1 `bsgaming` | Catalog; staff data in sections C8, 11-14 | Cloudflare (D1 primary location chosen at creation) |
| Supabase project `cmzyjhipqfiywnrlqbux` | Staff email, password hash, 2FA factors | ap-northeast-1 (Tokyo) |
| Shopper's browser | Saved items, PC build | Shopper's device |
| WhatsApp (Meta) | Shopper chats | Meta's servers |
| R2 `bsgaming-media` (not enabled yet) | Product photos uploaded by staff | Cloudflare |
