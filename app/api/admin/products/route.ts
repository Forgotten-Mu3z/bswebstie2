import { listAdminProducts, saveProduct } from '@/server/catalog/admin';
import { validateProduct } from '@/server/catalog/validation';
import { adminRoute } from '@/server/security/admin';
import { clientIp, json, readJson } from '@/server/security/http';

export const dynamic = 'force-dynamic';

export const GET = adminRoute('products.view', async () =>
  json({ products: await listAdminProducts() }),
);

export const POST = adminRoute('products.create', async (request, access) => {
  const input = validateProduct(await readJson(request));
  const product = await saveProduct({ access, ip: clientIp(request), input });
  return json({ product, message: 'Product added.' }, 201);
});
