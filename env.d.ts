// Bindings and variables available to the Worker (wrangler.jsonc + secrets).
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    /** R2 bucket for admin-uploaded product photos (optional until enabled). */
    FILES?: R2Bucket;
    /** "admin" on the admin Worker; anything else means the public store. */
    APP_ROLE?: string;
    /** Optional fixed public address, e.g. after adding a custom domain. */
    SITE_URL?: string;
    /** Admin Worker only: the store's address for the "View store" link. */
    STORE_URL?: string;
    /** Secret. Comma-separated, at most 2 addresses. */
    ADMIN_EMAILS?: string;
    /** Secret. Base64 of 32 random bytes; encrypts TOTP secrets. */
    TOTP_ENCRYPTION_KEY?: string;
    AUTH_LIMITER?: RateLimit;
    UPLOAD_LIMITER?: RateLimit;
    ADMIN_LIMITER?: RateLimit;
    SEARCH_LIMITER?: RateLimit;
    GENERAL_LIMITER?: RateLimit;
  }
}
