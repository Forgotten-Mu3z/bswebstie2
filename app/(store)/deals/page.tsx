import {
  breadcrumbLd,
  fitDescription,
  itemListLd,
  pageMetadata,
} from '@/lib/seo';
import { JsonLd } from '@/components/ui/json-ld';
import { CatalogView } from '@/components/store/catalog-view';
import { readFilters, type SearchParams } from '@/server/catalog/filters';
import { findProducts, getBrands } from '@/server/catalog/public';
import { getSiteUrl } from '@/server/site-url';

export const metadata = pageMetadata({
  title: 'Deals on Gaming PC Parts & Gear in Oman | BLACKSHARK',
  description: fitDescription([
    'Current deals at BLACKSHARK in Oman: gaming PC parts, monitors and gear with a real sale price below the regular price.',
    'Prices in OMR with live stock.',
  ]),
  path: '/deals',
});

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
  const siteUrl = await getSiteUrl();
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(siteUrl, [{ name: 'Deals', path: '/deals' }]),
          itemListLd(
            siteUrl,
            'Deals',
            products.map((product) => ({
              name: product.name,
              path: `/products/${product.slug}`,
            })),
          ),
        ]}
      />
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
    </>
  );
}
