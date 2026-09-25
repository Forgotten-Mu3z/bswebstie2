import { env } from 'cloudflare:workers';

// One build runs as two Workers. APP_ROLE=admin serves only the admin panel;
// anything else is the public store, which has no admin routes at all.
// Unknown or missing values fall back to the store (fail closed).
export function isAdminSite() {
  return env.APP_ROLE === 'admin';
}

/** Paths that only exist on the admin site. */
export const ADMIN_PATHS = [
  '/admin',
  '/sign-in',
  '/security',
  '/api/admin',
  '/api/auth',
];

/** Paths both sites serve (uploaded product photos, robots.txt). */
export const SHARED_PATHS = ['/api/product-images', '/robots.txt'];

export function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// At most two people can ever reach the admin panel. The list lives in the
// ADMIN_EMAILS Worker secret, not in the repository.
const MAX_ADMINS = 2;

export function adminEmails() {
  const emails = (env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (emails.length > MAX_ADMINS)
    console.error(
      `ADMIN_EMAILS lists ${emails.length} addresses; only the first ${MAX_ADMINS} can sign in.`,
    );
  return emails.slice(0, MAX_ADMINS);
}

export function isAllowedAdmin(email: string) {
  return adminEmails().includes(email.trim().toLowerCase());
}
