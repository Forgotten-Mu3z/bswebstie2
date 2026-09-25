import { getD1, getPhotoBucket } from '@/server/db';
import { adminRoute } from '@/server/security/admin';
import { recordAudit } from '@/server/security/audit';
import { clientIp, HttpError, json, readJson } from '@/server/security/http';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const UPLOAD_URL =
  /^\/api\/product-images\/([a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/;

/** Checks the file's first bytes, not just its declared type or name. */
function looksLike(bytes: Uint8Array, type: string) {
  if (type === 'image/jpeg')
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png')
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (b, i) => bytes[i] === b,
    );
  const ascii = new TextDecoder().decode(bytes);
  if (type === 'image/webp')
    return ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';
  return ascii.slice(4, 8) === 'ftyp' && /avif|avis/.test(ascii.slice(8, 16));
}

function bucketOrFail() {
  const bucket = getPhotoBucket();
  if (!bucket)
    throw new HttpError(
      503,
      'Photo storage is not set up yet (turn on R2 in Cloudflare). Other details can still be saved.',
      'image',
    );
  return bucket;
}

export const POST = adminRoute('products.view', async (request, access) => {
  if (!access.can('products.create') && !access.can('products.edit'))
    throw new HttpError(403, 'Your account cannot upload photos.');
  if (
    Number(request.headers.get('content-length') || 0) >
    MAX_BYTES + 64 * 1024
  )
    throw new HttpError(413, 'Photos must be 5 MB or smaller.', 'image');
  if (!request.headers.get('content-type')?.includes('multipart/form-data'))
    throw new HttpError(415, 'Choose a photo to upload.', 'image');
  const bucket = bucketOrFail();

  const file = (await request.formData()).get('image');
  if (!(file instanceof File))
    throw new HttpError(400, 'Choose a photo to upload.', 'image');
  if (!file.size || file.size > MAX_BYTES)
    throw new HttpError(413, 'Photos must be 5 MB or smaller.', 'image');
  if (!TYPES.has(file.type))
    throw new HttpError(415, 'Use a JPG, PNG, WebP or AVIF photo.', 'image');
  const bytes = await file.arrayBuffer();
  if (!looksLike(new Uint8Array(bytes.slice(0, 16)), file.type))
    throw new HttpError(415, 'That file is not a valid photo.', 'image');

  const id = crypto.randomUUID();
  await bucket.put(`products/${id}`, bytes, {
    httpMetadata: { contentType: file.type },
    customMetadata: { uploadedBy: access.user.userId },
  });
  const url = `/api/product-images/${id}`;
  await recordAudit({
    actorUserId: access.user.userId,
    action: 'photo.upload',
    resourceType: 'product_image',
    resourceId: id,
    after: { url, type: file.type, size: file.size },
    ipAddress: clientIp(request),
  });
  return json({ url }, 201);
});

/** Removes an uploaded photo that no product uses (e.g. a discarded upload). */
export const DELETE = adminRoute('products.edit', async (request, access) => {
  const body = await readJson(request, 300);
  const url =
    typeof (body as { url?: unknown })?.url === 'string'
      ? (body as { url: string }).url
      : '';
  const id = url.match(UPLOAD_URL)?.[1];
  if (!id) throw new HttpError(400, 'Unknown photo.');
  const used = await getD1()
    .prepare('SELECT 1 FROM products WHERE image_key = ?')
    .bind(url)
    .first();
  if (used) throw new HttpError(409, 'This photo is still used by a product.');
  await bucketOrFail().delete(`products/${id}`);
  await recordAudit({
    actorUserId: access.user.userId,
    action: 'photo.delete',
    resourceType: 'product_image',
    resourceId: id,
    before: { url },
    ipAddress: clientIp(request),
  });
  return new Response(null, { status: 204 });
});
