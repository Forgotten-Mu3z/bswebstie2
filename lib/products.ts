import type { Attributes, PartType } from './catalog';

/**
 * The only product shape the public site receives. Admin-only fields
 * (status, low-stock threshold, Arabic name, timestamps) are never included.
 */
export type PublicProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  summary: string;
  brand: string | null;
  category: string;
  categorySlug: string;
  partType: PartType | null;
  attributes: Attributes;
  priceBaisa: number;
  salePriceBaisa: number | null;
  stock: number;
  image: string | null;
  featured: boolean;
};

/** One live search suggestion: only what the dropdown shows. */
export type Suggestion = {
  slug: string;
  name: string;
  brand: string | null;
  image: string | null;
  priceBaisa: number;
  inStock: boolean;
};

export const PHOTO_NEEDED = '/product-photo-needed.svg';

/** Price customers pay: the sale price only when it is actually lower. */
export function currentPrice(product: {
  priceBaisa: number;
  salePriceBaisa: number | null;
}) {
  return product.salePriceBaisa !== null &&
    product.salePriceBaisa < product.priceBaisa
    ? product.salePriceBaisa
    : product.priceBaisa;
}

export function discountPercent(product: {
  priceBaisa: number;
  salePriceBaisa: number | null;
}) {
  const price = currentPrice(product);
  return price < product.priceBaisa
    ? Math.round((1 - price / product.priceBaisa) * 100)
    : 0;
}

export function imageAlt(product: Pick<PublicProduct, 'name' | 'image'>) {
  return product.image ? product.name : `Photo coming soon: ${product.name}`;
}

// Prices are stored as whole baisa (1 OMR = 1000 baisa).
const amountFormat = new Intl.NumberFormat('en-OM', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

/** "1,399.000" */
export function formatAmount(baisa: number) {
  return amountFormat.format(baisa / 1000);
}

/** "OMR 1,399.000" */
export function formatOMR(baisa: number) {
  return `OMR ${formatAmount(baisa)}`;
}

export function itemCount(count: number) {
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}
