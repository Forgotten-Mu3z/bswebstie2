import {
  ATTRIBUTE_FIELDS,
  isPartType,
  parseAttributes,
  type Attributes,
  type PartType,
} from '@/lib/catalog';
import { HttpError } from '@/server/security/http';

// Server-side validation for the admin product form. Only these fields can
// ever be written; anything else in the request is ignored.

export type ProductInput = {
  name: string;
  nameAr: string;
  slug: string;
  sku: string;
  summary: string;
  categoryId: string;
  brandId: string | null;
  partType: PartType | null;
  attributes: Attributes;
  priceBaisa: number;
  salePriceBaisa: number | null;
  stock: number;
  stockOnRequest: boolean;
  lowStockThreshold: number;
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  featured: boolean;
  imageKey: string | null;
};

const fail = (field: string, message: string): never => {
  throw new HttpError(400, message, field);
};

/** A form value as trimmed text; anything that is not a string or number is empty. */
const raw = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number'
    ? String(value).trim()
    : '';

function text(
  input: Record<string, unknown>,
  field: string,
  max: number,
  required = true,
) {
  const value = input[field];
  if (value !== undefined && value !== null && typeof value !== 'string')
    fail(field, 'Enter text here.');
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (required && !trimmed) fail(field, 'This field is required.');
  if (trimmed.length > max) fail(field, `Use ${max} characters or fewer.`);
  return trimmed;
}

function omr(input: Record<string, unknown>, field: string, required: boolean) {
  const value = raw(input[field]);
  if (!value) return required ? fail(field, 'Enter a price.') : null;
  if (!/^\d{1,6}(\.\d{1,3})?$/.test(value))
    fail(field, 'Use an OMR amount like 12.5 or 12.500 (up to 3 decimals).');
  return Math.round(Number(value) * 1000);
}

function wholeNumber(input: Record<string, unknown>, field: string) {
  const value = raw(input[field]);
  if (!/^\d{1,6}$/.test(value))
    fail(field, 'Enter a whole number from 0 to 999999.');
  return Number(value);
}

const IMAGE_KEY =
  /^(\/products\/[a-z0-9-]{1,120}\.webp|\/api\/product-images\/[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})$/;

export function validateProduct(body: unknown): ProductInput {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new HttpError(400, 'Those product details could not be read.');
  const input = body as Record<string, unknown>;

  const slug = text(input, 'slug', 120);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug))
    fail('slug', 'Use lowercase letters, numbers and single hyphens.');
  const sku = text(input, 'sku', 80);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(sku))
    fail('sku', 'Use letters, numbers, dots, dashes or underscores.');

  const priceBaisa = omr(input, 'price', true) as number;
  const salePriceBaisa = omr(input, 'salePrice', false);
  if (salePriceBaisa !== null && salePriceBaisa >= priceBaisa)
    fail('salePrice', 'The sale price must be lower than the regular price.');

  const partType = input.partType ? input.partType : null;
  if (partType !== null && !isPartType(partType))
    fail('partType', 'Choose a part type from the list.');
  // Keep only the attributes that apply to this part type.
  const allowed = partType
    ? (ATTRIBUTE_FIELDS[partType as PartType] ?? [])
    : [];
  const parsed = parseAttributes(input.attributes ?? {});
  const attributes = Object.fromEntries(
    Object.entries(parsed).filter(([key]) =>
      allowed.includes(key as keyof Attributes),
    ),
  ) as Attributes;

  const status = input.status;
  if (status !== 'DRAFT' && status !== 'PUBLISHED' && status !== 'HIDDEN')
    fail('status', 'Choose draft, published or hidden.');
  if (status === 'PUBLISHED' && priceBaisa <= 0)
    fail('price', 'Set a price above 0 before publishing.');
  if (typeof input.featured !== 'boolean')
    fail('featured', 'Choose yes or no.');
  // Optional so older clients still work; anything but true means "no".
  const stockOnRequest = input.stockOnRequest === true;

  const imageKey = raw(input.imageKey) || null;
  if (imageKey && !IMAGE_KEY.test(imageKey))
    fail('image', 'Upload the photo with the photo field.');

  const brandId = text(input, 'brandId', 80, false) || null;

  return {
    name: text(input, 'name', 180),
    nameAr: text(input, 'nameAr', 180, false),
    slug,
    sku,
    summary: text(input, 'summary', 1000),
    categoryId: text(input, 'categoryId', 80),
    brandId,
    partType: partType as PartType | null,
    attributes,
    priceBaisa,
    salePriceBaisa,
    stock: wholeNumber(input, 'stock'),
    stockOnRequest,
    lowStockThreshold: wholeNumber(input, 'lowStockThreshold'),
    status: status as ProductInput['status'],
    featured: input.featured as boolean,
    imageKey,
  };
}
