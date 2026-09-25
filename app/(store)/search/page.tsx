import {
  breadcrumbLd,
  fitDescription,
  fitTitle,
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

// Result pages are not indexed (they change with every query), but still get
// a clear title and a canonical.
export async function generateMetadata({ searchParams }: Props) {
  const search = await searchParams;
  const raw = search.q;
  const q = typeof raw === 'string' ? raw.trim().slice(0, 60) : '';
  const { page } = readFilters(search).values;
  const suffix = page > 1 ? `, page ${page}` : '';
  return pageMetadata({
    title: q
      ? fitTitle(`${q}${suffix}`, [
          (c) => `Search results for “${c}”: Gaming PCs & Parts | BLACKSHARK`,
          (c) => `Search results for “${c}” | BLACKSHARK Gaming Oman`,
          (c) => `“${c}” search results | BLACKSHARK Oman`,
          (c) => `“${c}” | BLACKSHARK`,
        ])
      : page > 1
        ? `All Products, Page ${page}: Gaming PCs & Parts | BLACKSHARK`
        : 'All Products: Gaming PCs, Parts & Gear | BLACKSHARK Oman',
    description: fitDescription([
      (page > 1 ? `Page ${page}: ` : '') +
        (q
          ? `Products matching “${q}” at BLACKSHARK in Oman.`
          : 'Every product at BLACKSHARK in Oman: gaming PCs, PC components, monitors, consoles, gaming gear and digital cards.'),
      'Filter by brand, price and stock.',
    ]),
    path: listingHref('/search', { ...readFilters({}).values, q, page }, page),
    noindex: true,
  });
}

export default async function SearchPage({ searchParams }: Props) {
  const { values, query, active } = readFilters(await searchParams);
  const [products, total, brands] = await Promise.all([
    findProducts(query),
    countProducts(query),
    getBrands(),
  ]);
  const pages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  if (values.page > pages) notFound();
  const brandName = brands.find((brand) => brand.slug === values.brand)?.name;
  const siteUrl = await getSiteUrl();
  return (
    <>
      <JsonLd
        data={breadcrumbLd(siteUrl, [
          { name: 'All products', path: '/search' },
        ])}
      />
      <CatalogView
        eyebrow={values.q ? 'Search results' : 'Catalog'}
        title={values.q ? `“${values.q}”` : (brandName ?? 'All products')}
        products={products}
        total={total}
        pagination={{
          page: values.page,
          pages,
          href: (page) => listingHref('/search', values, page),
        }}
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
    </>
  );
}
