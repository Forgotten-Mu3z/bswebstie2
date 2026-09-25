import { getProductsByIds } from '@/server/catalog/public';
import { json } from '@/server/security/http';

export const dynamic = 'force-dynamic';

const ID = /^[A-Za-z0-9_-]{1,80}$/;

// Current public details for products saved in a shopper's cart or wishlist,
// so saved copies pick up new prices, stock and availability.
export async function GET(request: Request) {
  const ids = [
    ...new Set(
      (new URL(request.url).searchParams.get('ids') ?? '')
        .split(',')
        .filter((id) => ID.test(id)),
    ),
  ].slice(0, 100);
  return json({ products: await getProductsByIds(ids) });
}
