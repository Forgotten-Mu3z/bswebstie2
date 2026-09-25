import { env } from 'cloudflare:workers';

// Per-visitor (IP address) request limits for every endpoint, using
// Cloudflare's Workers rate limiter (no database use). The numbers live on the
// bindings in wrangler.jsonc.

type LimiterName =
  | 'AUTH_LIMITER'
  | 'UPLOAD_LIMITER'
  | 'ADMIN_LIMITER'
  | 'SEARCH_LIMITER'
  | 'GENERAL_LIMITER';

// First match wins.
const RULES: {
  name: string;
  limiter: LimiterName;
  test: (path: string) => boolean;
}[] = [
  {
    name: 'auth',
    limiter: 'AUTH_LIMITER',
    test: (p) => p.startsWith('/api/auth/'),
  },
  {
    name: 'upload',
    limiter: 'UPLOAD_LIMITER',
    test: (p) => p === '/api/admin/product-images',
  },
  {
    name: 'admin',
    limiter: 'ADMIN_LIMITER',
    test: (p) =>
      p.startsWith('/api/admin/') ||
      p === '/admin' ||
      p.startsWith('/admin/') ||
      p.startsWith('/sign-in') ||
      p === '/security',
  },
  {
    name: 'search',
    limiter: 'SEARCH_LIMITER',
    test: (p) => p === '/api/search' || p === '/api/products',
  },
  { name: 'general', limiter: 'GENERAL_LIMITER', test: () => true },
];

/** Returns a 429 response when the visitor is over the limit, else null. */
export async function checkRequestLimit(request: Request, pathname: string) {
  if (pathname.startsWith('/_next/static/')) return null;
  const rule = RULES.find(({ test }) => test(pathname))!;
  const limiter = env[rule.limiter];
  // A missing binding is a misconfiguration: keep the site up (the sign-in
  // lockouts in lockout.ts still apply).
  if (!limiter) return null;
  const ip = request.headers.get('cf-connecting-ip') ?? 'local';
  if ((await limiter.limit({ key: `${rule.name}:${ip}` })).success) return null;

  const headers = { 'Retry-After': '60', 'Cache-Control': 'no-store' };
  if (pathname.startsWith('/api/'))
    return Response.json(
      { error: 'Too many requests. Wait a minute, then try again.' },
      { status: 429, headers },
    );
  return new Response(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Please wait</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d11;color:#e9edf2;font-family:system-ui,sans-serif;padding:16px;text-align:center"><main><h1 style="font-size:1.5rem">Too many requests</h1><p style="color:#8b95a3">Please wait a minute, then reload the page.</p></main></body></html>',
    {
      status: 429,
      headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' },
    },
  );
}
