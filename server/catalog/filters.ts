import { isPartType, SORTS, type Sort } from '@/lib/catalog';
import type { ProductQuery } from './public';

// Turns URL search params into a safe product query (and back).

/** Products per catalog page; keeps each page quick to render. */
export const CATALOG_PAGE_SIZE = 36;

export type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.slice(0, 100) ?? '';

const omrToBaisa = (value: string) =>
  /^\d{1,6}(\.\d{1,3})?$/.test(value)
    ? Math.round(Number(value) * 1000)
    : undefined;

export type FilterValues = {
  q: string;
  type: string;
  brand: string;
  sort: Sort;
  stock: boolean;
  sale: boolean;
  min: string;
  max: string;
  page: number;
};

export function readFilters(
  params: SearchParams,
  defaultSort: Sort = 'featured',
) {
  const sort = first(params.sort);
  const values: FilterValues = {
    q: first(params.q).trim(),
    type: isPartType(first(params.type)) ? first(params.type) : '',
    brand: /^[a-z0-9-]{1,60}$/.test(first(params.brand))
      ? first(params.brand)
      : '',
    sort: sort in SORTS ? (sort as Sort) : defaultSort,
    stock: first(params.stock) === '1',
    sale: first(params.sale) === '1',
    min: omrToBaisa(first(params.min)) !== undefined ? first(params.min) : '',
    max: omrToBaisa(first(params.max)) !== undefined ? first(params.max) : '',
    page: /^[1-9]\d{0,3}$/.test(first(params.page))
      ? Number(first(params.page))
      : 1,
  };
  const query: ProductQuery = {
    q: values.q || undefined,
    type: isPartType(values.type) ? values.type : undefined,
    brand: values.brand || undefined,
    sort: values.sort,
    inStock: values.stock,
    onSale: values.sale,
    minBaisa: omrToBaisa(values.min),
    maxBaisa: omrToBaisa(values.max),
    limit: CATALOG_PAGE_SIZE,
    offset: (values.page - 1) * CATALOG_PAGE_SIZE,
  };
  const active = [
    values.type,
    values.brand,
    values.stock,
    values.sale,
    values.min,
    values.max,
  ].filter(Boolean).length;
  return { values, query, active };
}

/** The URL for another page of the same listing and filters. */
export function listingHref(
  action: string,
  values: FilterValues,
  page: number,
  defaultSort: Sort = 'featured',
) {
  const query = new URLSearchParams();
  if (values.q) query.set('q', values.q);
  if (values.type) query.set('type', values.type);
  if (values.brand) query.set('brand', values.brand);
  if (values.sort !== defaultSort) query.set('sort', values.sort);
  if (values.stock) query.set('stock', '1');
  if (values.sale) query.set('sale', '1');
  if (values.min) query.set('min', values.min);
  if (values.max) query.set('max', values.max);
  if (page > 1) query.set('page', String(page));
  const text = query.toString();
  return text ? `${action}?${text}` : action;
}
