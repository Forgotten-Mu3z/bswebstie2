import {
  breadcrumbLd,
  fitDescription,
  itemListLd,
  pageMetadata,
} from '@/lib/seo';
import { JsonLd } from '@/components/ui/json-ld';
import { CatalogView } from '@/components/store/catalog-view';
import { notFound } from 'next/navigation';
import {
  CATALOG_PAGE_SIZE,
  listingHref,
  readFilters,
  type SearchParams,
} from '@/server/catalog/filters';
import {
  countProducts,
  findProducts,
  getBrands,
} from '@/server/catalog/public';
import { getSiteUrl } from '@/server/site-url';

type Props = { searchParams: Promise<SearchParams> };

export async function generateMetadata({ searchParams }: Props) {
  const { page } = readFilters(await searchParams, 'price-asc').values;
  return pageMetadata({
    title:
      page > 1
        ? `Deals, Page ${page}: Gaming PC Parts & Gear | BLACKSHARK`
        : 'Deals on Gaming PC Parts & Gear in Oman | BLACKSHARK',
    description: fitDescription([
      `${page > 1 ? `Page ${page}: ` : ''}Current deals at BLACKSHARK in Oman: gaming PC parts, monitors and gear with a real sale price below the regular price.`,
      'Prices in OMR with live stock.',
    ]),
    path: page > 1 ? `/deals?page=${page}` : '/deals',
  });
}

// Only products whose catalog sale price is below the regular price.
export default async function DealsPage({ searchParams }: Props) {
  const { values, query, active } = readFilters(
    await searchParams,
    'price-asc',
  );
  const [products, total, brands] = await Promise.all([
    findProducts({ ...query, onSale: true }),
    countProducts({ ...query, onSale: true }),
    getBrands(),
  ]);
  const pages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  if (values.page > pages) notFound();
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
        total={total}
        pagination={{
          page: values.page,
          pages,
          href: (page) => listingHref('/deals', values, page, 'price-asc'),
        }}
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
