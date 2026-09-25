import { notFound } from 'next/navigation';
import { partTypeLabel } from '@/lib/catalog';
import {
  breadcrumbLd,
  fitDescription,
  fitTitle,
  itemListLd,
  pageMetadata,
} from '@/lib/seo';
import { JsonLd } from '@/components/ui/json-ld';
import { CatalogView, type Chip } from '@/components/store/catalog-view';
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
  getCategories,
  getPartTypeCounts,
} from '@/server/catalog/public';
import { getSiteUrl } from '@/server/site-url';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
};

async function findCategory(slug: string) {
  return (
    (await getCategories()).find((category) => category.slug === slug) ?? null
  );
}

const TITLES = [
  (c: string) => `${c} in Oman: Prices, Specs & Live Stock | BLACKSHARK`,
  (c: string) => `${c} in Oman: Prices & Live Stock | BLACKSHARK`,
  (c: string) => `${c} in Oman: Prices & Stock | BLACKSHARK`,
  (c: string) => `${c} Prices in Oman | BLACKSHARK`,
  (c: string) => `${c} | BLACKSHARK`,
];

/** The part-type filter and page number make their own listing (and canonical); other filters do not. */
function listingPath(slug: string, type: string | undefined, page = 1) {
  const query = new URLSearchParams();
  if (type) query.set('type', type);
  if (page > 1) query.set('page', String(page));
  const text = query.toString();
  return text ? `/categories/${slug}?${text}` : `/categories/${slug}`;
}

export async function generateMetadata({ params, searchParams }: Props) {
  const category = await findCategory((await params).slug);
  if (!category)
    return { title: 'Category not found', robots: { index: false } };
  const search = await searchParams;
  const rawType = search.type;
  const { page } = readFilters(search).values;
  const type =
    typeof rawType === 'string' ? partTypeLabel(rawType, false) : null;
  const name = type ?? category.name;
  return pageMetadata({
    title: fitTitle(page > 1 ? `${name}, Page ${page}` : name, TITLES),
    description: fitDescription([
      `${page > 1 ? `Page ${page}: ` : ''}Shop ${name.toLowerCase()} at BLACKSHARK in Oman.`,
      type
        ? `Compare ${name.toLowerCase()} by brand, specs and stock.`
        : category.description,
    ]),
    path: listingPath(
      category.slug,
      type && typeof rawType === 'string' ? rawType : undefined,
      page,
    ),
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) notFound();

  const { values, query, active } = readFilters(await searchParams);
  const [products, total, types, brands] = await Promise.all([
    findProducts({ ...query, category: slug }),
    countProducts({ ...query, category: slug }),
    getPartTypeCounts(slug),
    getBrands(),
  ]);
  const pages = Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE));
  if (values.page > pages) notFound();
  const action = `/categories/${slug}`;
  const typeLabel = types.find((type) => type.value === values.type)?.label;
  const chips: Chip[] = types.length
    ? [
        {
          label: 'All parts',
          href: action,
          active: !values.type,
          count: category.productCount,
        },
        ...types.map((type) => ({
          label: type.label,
          href: `${action}?type=${type.value}`,
          count: type.count,
          active: values.type === type.value,
        })),
      ]
    : [];

  const siteUrl = await getSiteUrl();
  const path = listingPath(
    slug,
    typeLabel ? values.type : undefined,
    values.page,
  );
  const listName = typeLabel ?? category.name;
  return (
    <>
      <JsonLd
        data={[
          breadcrumbLd(siteUrl, [
            { name: category.name, path: `/categories/${slug}` },
            ...(typeLabel ? [{ name: typeLabel, path }] : []),
          ]),
          itemListLd(
            siteUrl,
            listName,
            products.slice(0, 30).map((product) => ({
              name: product.name,
              path: `/products/${product.slug}`,
            })),
          ),
        ]}
      />
      <CatalogView
        eyebrow={typeLabel ? category.name : 'Category'}
        title={typeLabel ?? category.name}
        description={typeLabel ? undefined : category.description}
        chips={chips}
        products={products}
        total={total}
        pagination={{
          page: values.page,
          pages,
          href: (page) => listingHref(action, values, page),
        }}
        filters={{ values, brands, action, active }}
        empty={
          category.productCount
            ? {
                title: 'No products match',
                text: 'Try removing a filter or widening the price range.',
              }
            : {
                title: 'Nothing here yet',
                text: `${category.name} will appear here as soon as the store adds them.`,
              }
        }
      />
    </>
  );
}
