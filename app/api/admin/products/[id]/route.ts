import { deleteProduct, saveProduct } from '@/server/catalog/admin';
import { validateProduct } from '@/server/catalog/validation';
import { adminRoute } from '@/server/security/admin';
import { clientIp, HttpError, json, readJson } from '@/server/security/http';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

/** The version (last-updated time) the admin was editing, to catch conflicts. */
function versionOf(body: unknown) {
  const version =
    body && typeof body === 'object'
      ? (body as { version?: unknown }).version
      : undefined;
  if (typeof version !== 'string' || !/^\d{1,16}$/.test(version))
    throw new HttpError(400, 'Reload the product and try again.');
  return version;
}

async function productId(context: Context) {
  const { id } = await context.params;
  if (!/^[A-Za-z0-9-]{1,80}$/.test(id))
    throw new HttpError(404, 'Product not found.');
  return id;
}

export const PATCH = adminRoute(
  'products.edit',
  async (request, access, context: Context) => {
    const id = await productId(context);
    const body = await readJson(request);
    const product = await saveProduct({
      access,
      ip: clientIp(request),
      input: validateProduct(body),
      existing: { id, version: versionOf(body) },
    });
    return json({ product, message: 'Changes saved.' });
  },
);

export const DELETE = adminRoute(
  'products.delete',
  async (request, access, context: Context) => {
    const id = await productId(context);
    await deleteProduct({
      access,
      ip: clientIp(request),
      id,
      version: versionOf(await readJson(request, 500)),
    });
    return json({ message: 'Product deleted.' });
  },
);
