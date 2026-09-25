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
import { readFilters, type SearchParams } from '@/server/catalog/filters';
import {
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

/** The part-type filter is its own listing (and canonical); other filters are not. */
function listingPath(slug: string, type: string | undefined) {
  return type ? `/categories/${slug}?type=${type}` : `/categories/${slug}`;
}

export async function generateMetadata({ params, searchParams }: Props) {
  const category = await findCategory((await params).slug);
  if (!category)
    return { title: 'Category not found', robots: { index: false } };
  const rawType = (await searchParams).type;
  const type =
    typeof rawType === 'string' ? partTypeLabel(rawType, false) : null;
  const name = type ?? category.name;
  return pageMetadata({
    title: fitTitle(name, TITLES),
    description: fitDescription([
      `Shop ${name.toLowerCase()} at BLACKSHARK in Oman.`,
      type
        ? `Compare ${name.toLowerCase()} by brand, specs and stock.`
        : category.description,
    ]),
    path: listingPath(
      category.slug,
      type && typeof rawType === 'string' ? rawType : undefined,
    ),
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await findCategory(slug);
  if (!category) notFound();

  const { values, query, active } = readFilters(await searchParams);
  const [products, types, brands] = await Promise.all([
    findProducts({ ...query, category: slug }),
    getPartTypeCounts(slug),
    getBrands(),
  ]);
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
  const path = listingPath(slug, typeLabel ? values.type : undefined);
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
