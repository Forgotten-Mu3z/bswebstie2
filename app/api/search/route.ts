import { currentPrice, type Suggestion } from '@/lib/products';
import { getSuggestions } from '@/server/catalog/public';
import { json } from '@/server/security/http';

export const dynamic = 'force-dynamic';

// Live search suggestions: only the fields the dropdown shows.
export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get('q') ?? '').slice(0, 100);
  const products = await getSuggestions(q);
  const suggestions: Suggestion[] = products.map((product) => ({
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    image: product.image,
    priceBaisa: currentPrice(product),
    inStock: product.stock > 0,
  }));
  return json({ suggestions });
}
