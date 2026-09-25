import { drainSmallBody, HttpError, notFound, redirect } from './http';
import { isAdminSite } from './site';

// Shared plumbing for the sign-in pages' form posts: admin site only, and any
// unexpected failure becomes a redirect back to the page with an error code
// (never a stack trace or raw message).

/** pageUrl('/sign-in', { error: 'locked', return_to: '/admin/products' }) */
export function pageUrl(
  path: string,
  params: Record<string, string | null | undefined>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params))
    if (value && !(key === 'return_to' && value === '/admin'))
      query.set(key, value);
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

export function formRoute(
  errorPage: string,
  handler: (request: Request) => Promise<Response>,
) {
  return async (request: Request) => {
    try {
      if (!isAdminSite()) {
        await drainSmallBody(request);
        return notFound();
      }
      return await handler(request);
    } catch (error) {
      await drainSmallBody(request);
      if (error instanceof HttpError)
        return redirect(
          pageUrl(errorPage, {
            error: error.status === 403 ? 'blocked' : 'invalid',
          }),
        );
      console.error('Sign-in step failed', error);
      return redirect(pageUrl(errorPage, { error: 'unavailable' }));
    }
  };
}
