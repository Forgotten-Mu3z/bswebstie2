import { isPartType, SORTS, type Sort } from '@/lib/catalog';
import type { ProductQuery } from './public';

// Turns URL search params into a safe product query (and back).

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
