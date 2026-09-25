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
  /** No stock count is shown; availability is confirmed on WhatsApp. */
  stockOnRequest: boolean;
  image: string | null;
  featured: boolean;
  /** The store's own post the listing came from (Instagram), if any. */
  sourceUrl: string | null;
};

/** One live search suggestion: only what the dropdown shows. */
export type Suggestion = {
  slug: string;
  name: string;
  brand: string | null;
  image: string | null;
  priceBaisa: number;
  inStock: boolean;
  onRequest: boolean;
};

export const PHOTO_NEEDED = '/product-photo-needed.svg';

type Availability = { stock: number; stockOnRequest?: boolean };

/** Has stock, or its stock is only confirmed on WhatsApp. */
export const canOrder = (product: Availability) =>
  Boolean(product.stockOnRequest) || product.stock > 0;

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
