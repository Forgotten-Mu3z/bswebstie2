import { CatalogView } from '@/components/store/catalog-view';
import { readFilters, type SearchParams } from '@/server/catalog/filters';
import { findProducts, getBrands } from '@/server/catalog/public';

export const metadata = {
  title: 'Deals',
  description:
    'Products with a lower sale price right now at BLACKSHARK, Oman.',
  alternates: { canonical: '/deals' },
};

// Only products whose catalog sale price is below the regular price.
export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { values, query, active } = readFilters(
    await searchParams,
    'price-asc',
  );
  const [products, brands] = await Promise.all([
    findProducts({ ...query, onSale: true }),
    getBrands(),
  ]);
  return (
    <CatalogView
      eyebrow="Price drops"
      title="Deals"
      description="Every product here has a sale price lower than its regular price. The discount is worked out from those two prices."
      products={products}
      filters={{
        values: { ...values, sale: false },
        brands,
        action: '/deals',
        active,
      }}
      empty={{
        title: 'No deals right now',
        text: 'Sale items appear here when the store lowers a price.',
      }}
    />
  );
}
