import { notFound } from 'next/navigation';
import { CatalogView, type Chip } from '@/components/store/catalog-view';
import { readFilters, type SearchParams } from '@/server/catalog/filters';
import {
  findProducts,
  getBrands,
  getCategories,
  getPartTypeCounts,
} from '@/server/catalog/public';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
};

async function findCategory(slug: string) {
  return (
    (await getCategories()).find((category) => category.slug === slug) ?? null
  );
}

export async function generateMetadata({ params }: Props) {
  const category = await findCategory((await params).slug);
  if (!category) return { title: 'Category not found' };
  return {
    title: category.name,
    description: `${category.name} at BLACKSHARK, Oman. ${category.description}`,
    alternates: { canonical: `/categories/${category.slug}` },
  };
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

  return (
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
  );
}
