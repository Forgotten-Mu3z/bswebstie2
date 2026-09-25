import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';

// The public address of this site. SITE_URL wins when set (for example after
// adding a custom domain); otherwise it comes from the request, so the same
// build works locally, on workers.dev and on any domain.
export async function getSiteUrl() {
  if (env.SITE_URL) return env.SITE_URL.replace(/\/+$/, '');
  const requestHeaders = await headers();
  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  if (!host) return 'http://localhost:3000';
  const protocol =
    requestHeaders.get('x-forwarded-proto') ??
    (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? 'http' : 'https');
  return `${protocol}://${host}`;
}
