import { env } from 'cloudflare:workers';
import { NextResponse, type NextRequest } from 'next/server';
import { drainSmallBody } from '@/server/security/http';
import { checkRequestLimit } from '@/server/security/request-limits';
import {
  ADMIN_PATHS,
  isAdminSite,
  SHARED_PATHS,
  startsWithAny,
} from '@/server/security/site';

// Runs before every page and API route:
//   1. one address for the store: once SITE_URL is set (a custom domain),
//      any other host, such as *.workers.dev, gets a permanent redirect
//   2. per-visitor rate limits
//   3. keeps each site to its own paths (pages and routes check again).
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const canonical = storeRedirect(request);
  if (canonical) {
    await drainSmallBody(request);
    return canonical;
  }

  const limited = await checkRequestLimit(request, pathname);
  if (limited) {
    await drainSmallBody(request);
    return limited;
  }

  const adminPath = startsWithAny(pathname, ADMIN_PATHS);
  if (!isAdminSite()) {
    // The store answers admin paths exactly like any unknown page.
    if (!adminPath) return NextResponse.next();
    await drainSmallBody(request);
    return notFound(request);
  }

  if (pathname === '/')
    return NextResponse.redirect(new URL('/admin', request.url));
  const allowed =
    adminPath ||
    startsWithAny(pathname, SHARED_PATHS) ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico';
  if (!allowed) await drainSmallBody(request);
  const response = allowed ? NextResponse.next() : notFound(request);
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

function storeRedirect(request: NextRequest) {
  if (isAdminSite() || !env.SITE_URL) return null;
  const target = new URL(env.SITE_URL);
  if (request.nextUrl.host === target.host) return null;
  const url = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    target,
  );
  return NextResponse.redirect(url, 301);
}

function notFound(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/'))
    return new NextResponse('Not found', { status: 404 });
  return NextResponse.rewrite(new URL('/_not-found', request.url));
}
