import { CatalogView } from '@/components/store/catalog-view';
import { readFilters, type SearchParams } from '@/server/catalog/filters';
import { findProducts, getBrands } from '@/server/catalog/public';

type Props = { searchParams: Promise<SearchParams> };

export async function generateMetadata({ searchParams }: Props) {
  const q = (await searchParams).q;
  return {
    title:
      typeof q === 'string' && q ? `Search: ${q.slice(0, 60)}` : 'All products',
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { values, query, active } = readFilters(await searchParams);
  const [products, brands] = await Promise.all([
    findProducts(query),
    getBrands(),
  ]);
  const brandName = brands.find((brand) => brand.slug === values.brand)?.name;
  return (
    <CatalogView
      eyebrow={values.q ? 'Search results' : 'Catalog'}
      title={values.q ? `“${values.q}”` : (brandName ?? 'All products')}
      products={products}
      filters={{ values, brands, action: '/search', active }}
      empty={{
        title: values.q
          ? `Nothing found for “${values.q}”`
          : 'No products match',
        text: values.q
          ? 'Check the spelling, try a shorter word (like “5070” or “DDR5”), or search by brand or SKU.'
          : 'Try removing a filter.',
      }}
    />
  );
}
