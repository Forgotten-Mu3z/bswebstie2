import { getPhotoBucket } from '@/server/db';

// Public: serves photos uploaded in the admin (stored in R2 under random ids).

export const dynamic = 'force-dynamic';

const ID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

async function serve(
  context: { params: Promise<{ id: string }> },
  withBody: boolean,
) {
  const { id } = await context.params;
  const bucket = getPhotoBucket();
  const object =
    ID.test(id) && bucket ? await bucket.get(`products/${id}`) : null;
  if (!object) return new Response('Not found', { status: 404 });
  const headers = new Headers({
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Content-Type':
      object.httpMetadata?.contentType ?? 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Content-Length': String(object.size),
    ETag: object.httpEtag,
  });
  return new Response(withBody ? object.body : null, { headers });
}

export function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return serve(context, true);
}

export function HEAD(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return serve(context, false);
}
