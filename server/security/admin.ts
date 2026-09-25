import {
  notFound as pageNotFound,
  redirect as pageRedirect,
} from 'next/navigation';
import { getD1 } from '@/server/db';
import {
  assertSameOrigin,
  drainSmallBody,
  errorResponse,
  HttpError,
  notFound,
} from './http';
import { getAdminUser, signInPath, type AdminUser } from './sessions';
import { isAdminSite } from './site';

// The single gate for the admin panel. Every admin page and API route goes
// through requireAdminPage() or adminRoute(); nothing relies on hidden links.

export const PERMISSIONS = [
  'products.view',
  'products.create',
  'products.edit',
  'products.delete',
  'products.publish',
  'inventory.edit',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type AdminAccess = {
  user: AdminUser;
  can: (permission: Permission) => boolean;
};

async function loadAccess(user: AdminUser): Promise<AdminAccess> {
  const { results } = await getD1()
    .prepare(
      `SELECT DISTINCT p.key FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = ?`,
    )
    .bind(user.userId)
    .all<{ key: string }>();
  const granted = new Set(results.map((row) => row.key));
  return { user, can: (permission) => granted.has(permission) };
}

/** For admin pages. Redirects to sign-in or the password page when needed. */
export async function requireAdminPage(returnTo = '/admin') {
  if (!isAdminSite()) pageNotFound();
  const user = await getAdminUser();
  if (!user) pageRedirect(signInPath(returnTo));
  if (user.mustChangePassword) pageRedirect('/security?required=1');
  return loadAccess(user);
}

/**
 * Wraps an admin API handler: admin site only, full 2FA session, no pending
 * temporary password, the given permission, and same-origin for writes.
 */
export function adminRoute<Context>(
  permission: Permission,
  handler: (
    request: Request,
    access: AdminAccess,
    context: Context,
  ) => Promise<Response>,
) {
  return async (request: Request, context: Context) => {
    try {
      if (!isAdminSite()) {
        await drainSmallBody(request);
        return notFound();
      }
      if (request.method !== 'GET' && request.method !== 'HEAD')
        assertSameOrigin(request);
      const user = await getAdminUser();
      if (!user) throw new HttpError(401, 'Sign in again to continue.');
      if (user.mustChangePassword)
        throw new HttpError(403, 'Change your temporary password first.');
      const access = await loadAccess(user);
      if (!access.can(permission))
        throw new HttpError(403, 'Your account is not allowed to do this.');
      return await handler(request, access, context);
    } catch (error) {
      return errorResponse(error, request);
    }
  };
}
