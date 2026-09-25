import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  like,
  lt,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { brands, categories, products } from '@/db/schema';
import {
  isPartType,
  parseAttributes,
  PART_TYPES,
  type PartType,
  type Sort,
} from '@/lib/catalog';
import { SLOTS } from '@/lib/pc-builder';
import type { PublicProduct } from '@/lib/products';
import { getDb } from '@/server/db';

// Everything the public store reads. Only published products in enabled
// categories are returned, always through toPublic(), so admin-only fields
// (status, low-stock threshold, Arabic name, timestamps) never reach a page.

const publicFields = {
  id: products.id,
  slug: products.slug,
  sku: products.sku,
  name: products.name,
  summary: products.summary,
  brand: brands.name,
  category: categories.name,
  categorySlug: categories.slug,
  partType: products.partType,
  attributes: products.attributes,
  priceBaisa: products.priceBaisa,
  salePriceBaisa: products.salePriceBaisa,
  stock: products.stock,
  stockOnRequest: products.stockOnRequest,
  image: products.imageKey,
  featured: products.featured,
  sourceUrl: products.sourceUrl,
};

type Row = Omit<PublicProduct, 'partType' | 'attributes'> & {
  partType: string | null;
  attributes: string;
};

function toPublic(row: Row): PublicProduct {
  return {
    ...row,
    partType: isPartType(row.partType) ? row.partType : null,
    attributes: parseAttributes(row.attributes),
  };
}

const visible = and(
  eq(products.status, 'PUBLISHED'),
  eq(categories.enabled, true),
);

const effectivePrice = sql<number>`CASE WHEN ${products.salePriceBaisa} IS NOT NULL AND ${products.salePriceBaisa} < ${products.priceBaisa} THEN ${products.salePriceBaisa} ELSE ${products.priceBaisa} END`;

function select() {
  return getDb()
    .select(publicFields)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id));
}

export type ProductQuery = {
  category?: string;
  type?: PartType;
  brand?: string;
  q?: string;
  sort?: Sort;
  inStock?: boolean;
  onSale?: boolean;
  minBaisa?: number;
  maxBaisa?: number;
  featured?: boolean;
  limit?: number;
  offset?: number;
};

/** Search text: matches name, SKU, summary, brand, category and part type. */
function searchCondition(raw: string): SQL | undefined {
  const term = raw
    .replace(/[%_\\]/g, ' ')
    .trim()
    .slice(0, 100);
  // Only wildcard characters were typed: match nothing, not everything.
  if (!term) return sql`0 = 1`;
  const pattern = `%${term}%`;
  const lower = term.toLowerCase();
  const types = PART_TYPES.filter(
    (type) =>
      lower.length >= 3 &&
      [type.value, type.label, type.single].some((text) =>
        text.toLowerCase().replace('-', ' ').includes(lower.replace('-', ' ')),
      ),
  ).map((type) => type.value);
  return or(
    like(products.name, pattern),
    like(products.sku, pattern),
    like(products.summary, pattern),
    like(brands.name, pattern),
    like(categories.name, pattern),
    types.length ? inArray(products.partType, types) : undefined,
  );
}

function orderFor(sort: Sort | undefined) {
  switch (sort) {
    case 'price-asc':
      return [asc(effectivePrice), asc(products.name)];
    case 'price-desc':
      return [desc(effectivePrice), asc(products.name)];
    case 'name':
      return [asc(products.name)];
    case 'newest':
      return [desc(products.createdAt), asc(products.name)];
    default:
      return [
        desc(products.featured),
        desc(products.updatedAt),
        asc(products.name),
      ];
  }
}

function productWhere(query: ProductQuery) {
  return and(
    visible,
    query.category ? eq(categories.slug, query.category) : undefined,
    query.type ? eq(products.partType, query.type) : undefined,
    query.brand ? eq(brands.slug, query.brand) : undefined,
    query.q ? searchCondition(query.q) : undefined,
    query.inStock ? gt(products.stock, 0) : undefined,
    query.onSale
      ? and(
          isNotNull(products.salePriceBaisa),
          lt(products.salePriceBaisa, products.priceBaisa),
        )
      : undefined,
    query.minBaisa !== undefined
      ? gte(effectivePrice, query.minBaisa)
      : undefined,
    query.maxBaisa !== undefined
      ? lte(effectivePrice, query.maxBaisa)
      : undefined,
    query.featured ? eq(products.featured, true) : undefined,
  );
}

export async function findProducts(query: ProductQuery = {}) {
  const rows = await select()
    .where(productWhere(query))
    .orderBy(...orderFor(query.sort))
    .limit(Math.min(query.limit ?? 120, 200))
    .offset(query.offset ?? 0);
  return rows.map(toPublic);
}

/** How many products match (ignores limit and offset), for page counts. */
export async function countProducts(query: ProductQuery = {}) {
  const [row] = await getDb()
    .select({ total: count(products.id) })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(productWhere(query));
  return row?.total ?? 0;
}

export async function getProduct(slug: string) {
  const [row] = await select()
    .where(and(visible, eq(products.slug, slug)))
    .limit(1);
  return row ? toPublic(row) : null;
}

export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const rows = await select().where(and(visible, inArray(products.id, ids)));
  return rows.map(toPublic);
}

/** Same part type for components, otherwise the same category. */
export async function getRelated(product: PublicProduct, limit = 4) {
  const rows = await select()
    .where(
      and(
        visible,
        ne(products.id, product.id),
        product.partType
          ? eq(products.partType, product.partType)
          : eq(categories.slug, product.categorySlug),
      ),
    )
    .orderBy(desc(products.featured), desc(products.updatedAt))
    .limit(limit);
  return rows.map(toPublic);
}

export async function getSuggestions(q: string) {
  if (q.trim().length < 2) return [];
  return findProducts({ q, limit: 6 });
}

export async function getCategories() {
  return getDb()
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      // Written out in full: drizzle drops the table name inside subqueries.
      productCount: sql<number>`(SELECT count(*) FROM products p WHERE p.category_id = "categories"."id" AND p.status = 'PUBLISHED')`,
    })
    .from(categories)
    .where(eq(categories.enabled, true))
    .orderBy(asc(categories.sortOrder));
}

export async function getBrands() {
  return getDb()
    .select({
      slug: brands.slug,
      name: brands.name,
      productCount: count(products.id),
    })
    .from(brands)
    .innerJoin(products, eq(products.brandId, brands.id))
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(visible)
    .groupBy(brands.id)
    .orderBy(desc(count(products.id)), asc(brands.name));
}

/** Part types that have published products in a category, with counts. */
export async function getPartTypeCounts(categorySlug: string) {
  const rows = await getDb()
    .select({ partType: products.partType, total: count(products.id) })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(
      and(
        visible,
        eq(categories.slug, categorySlug),
        isNotNull(products.partType),
      ),
    )
    .groupBy(products.partType);
  return PART_TYPES.flatMap((type) => {
    const row = rows.find((entry) => entry.partType === type.value);
    return row ? [{ ...type, count: row.total }] : [];
  });
}

export async function getBuilderParts() {
  const rows = await select()
    .where(
      and(
        visible,
        or(
          inArray(
            products.partType,
            SLOTS.flatMap((slot) => (slot.partType ? [slot.partType] : [])),
          ),
          inArray(
            categories.slug,
            SLOTS.flatMap((slot) => (slot.category ? [slot.category] : [])),
          ),
        ),
      ),
    )
    .orderBy(asc(effectivePrice));
  return rows.map(toPublic);
}

export async function getHomeData() {
  const [featured, newest, deals, cats, brandList] = await Promise.all([
    findProducts({ featured: true, sort: 'featured', limit: 8 }),
    findProducts({ sort: 'newest', limit: 8 }),
    findProducts({ onSale: true, sort: 'price-asc', limit: 8 }),
    getCategories(),
    getBrands(),
  ]);
  return { featured, newest, deals, categories: cats, brands: brandList };
}

export async function getSitemapEntries() {
  const [productRows, categoryRows] = await Promise.all([
    getDb()
      .select({
        slug: products.slug,
        categorySlug: categories.slug,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .where(visible),
    getDb()
      .select({ slug: categories.slug })
      .from(categories)
      .where(eq(categories.enabled, true)),
  ]);
  return { products: productRows, categories: categoryRows };
}
