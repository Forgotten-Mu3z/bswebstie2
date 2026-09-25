// Small, strict helpers for reading requests and writing responses.

/** An error that is safe to show: its message goes to the user as-is. */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public field?: string,
  ) {
    super(message);
  }
}

const NO_STORE = { 'Cache-Control': 'no-store' };

export function redirect(location: string, cookie?: string) {
  const headers = new Headers({ Location: location, ...NO_STORE });
  if (cookie) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 303, headers });
}

export function notFound() {
  return new Response('Not found', { status: 404, headers: NO_STORE });
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: NO_STORE });
}

export function clientIp(request: Request) {
  return request.headers.get('cf-connecting-ip') ?? 'local';
}

/** Blocks requests started by another website (CSRF). */
export function assertSameOrigin(request: Request) {
  if (
    request.headers.get('origin') !== new URL(request.url).origin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  )
    throw new HttpError(403, 'Request blocked. Reload the page and try again.');
}

/**
 * Reads a small unread body before an early reply: the local runtime can
 * reset otherwise. Large bodies are left alone rather than read for nothing.
 */
export async function drainSmallBody(request: Request) {
  const length = Number(request.headers.get('content-length') ?? NaN);
  if (request.body && !request.bodyUsed && length <= 64 * 1024)
    await request.arrayBuffer().catch(() => undefined);
}

async function readLimitedText(request: Request, maxBytes: number) {
  if (Number(request.headers.get('content-length') || 0) > maxBytes)
    throw new HttpError(413, 'That request is too large.');
  const text = await request.text();
  if (text.length > maxBytes)
    throw new HttpError(413, 'That request is too large.');
  return text;
}

/** A same-origin HTML form post (sign-in, 2FA, password pages). */
export async function readForm(request: Request, maxBytes = 4000) {
  const text = await readLimitedText(request, maxBytes);
  assertSameOrigin(request);
  if (
    !request.headers
      .get('content-type')
      ?.includes('application/x-www-form-urlencoded')
  )
    throw new HttpError(415, 'Unsupported form.');
  return new URLSearchParams(text);
}

/** A same-origin JSON body (admin API). */
export async function readJson(request: Request, maxBytes = 20_000) {
  const text = await readLimitedText(request, maxBytes);
  assertSameOrigin(request);
  if (!request.headers.get('content-type')?.includes('application/json'))
    throw new HttpError(415, 'Send the details as JSON.');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new HttpError(400, 'Those details could not be read.');
  }
}

/** Turns any error into a response without leaking internals. */
export async function errorResponse(error: unknown, request?: Request) {
  if (request) await drainSmallBody(request);
  if (error instanceof HttpError)
    return json({ error: error.message, field: error.field }, error.status);
  console.error('Request failed', error);
  return json(
    { error: 'Something went wrong on our side. Please try again.' },
    500,
  );
}
