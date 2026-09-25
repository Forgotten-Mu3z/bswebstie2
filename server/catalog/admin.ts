import {
  isPartType,
  parseAttributes,
  type Attributes,
  type PartType,
} from '@/lib/catalog';
import { getD1, getPhotoBucket } from '@/server/db';
import type { AdminAccess, Permission } from '@/server/security/admin';
import { auditStatement } from '@/server/security/audit';
import { HttpError } from '@/server/security/http';
import type { ProductInput } from './validation';

// Admin catalog operations. Callers have already passed adminRoute(); the
// finer permission checks (publish, stock) happen here, per change.

export type AdminProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  nameAr: string;
  summary: string;
  categoryId: string;
  brandId: string | null;
  partType: PartType | null;
  attributes: Attributes;
  priceBaisa: number;
  salePriceBaisa: number | null;
  stock: number;
  lowStockThreshold: number;
  status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  featured: boolean;
  imageKey: string | null;
  createdAt: number;
  /** Also the edit "version": an edit only applies if this has not changed. */
  updatedAt: number;
};

type Row = Record<string, unknown>;

function toAdmin(row: Row): AdminProduct {
  return {
    id: String(row.id),
    slug: String(row.slug),
    sku: String(row.sku),
    name: String(row.name),
    nameAr: typeof row.name_ar === 'string' ? row.name_ar : '',
    summary: String(row.summary),
    categoryId: String(row.category_id),
    brandId: typeof row.brand_id === 'string' ? row.brand_id : null,
    partType: isPartType(row.part_type) ? row.part_type : null,
    attributes: parseAttributes(row.attributes),
    priceBaisa: Number(row.price_baisa),
    salePriceBaisa:
      row.sale_price_baisa === null ? null : Number(row.sale_price_baisa),
    stock: Number(row.stock),
    lowStockThreshold: Number(row.low_stock_threshold),
    status: row.status as AdminProduct['status'],
    featured: Boolean(row.featured),
    imageKey: typeof row.image_key === 'string' ? row.image_key : null,
    createdAt: Number(row.created_at) * 1000,
    updatedAt: Number(row.updated_at) * 1000,
  };
}

/** Snapshot for the audit trail (no internal ids beyond the product). */
function snapshot(product: AdminProduct | ProductInput) {
  const {
    name,
    sku,
    slug,
    status,
    priceBaisa,
    salePriceBaisa,
    stock,
    featured,
    imageKey,
  } = product;
  return {
    name,
    sku,
    slug,
    status,
    priceBaisa,
    salePriceBaisa,
    stock,
    featured,
    imageKey,
  };
}

export async function listAdminProducts() {
  const { results } = await getD1()
    .prepare('SELECT * FROM products ORDER BY updated_at DESC, name')
    .all<Row>();
  return results.map(toAdmin);
}

export async function getLookups() {
  const d1 = getD1();
  const [cats, brandRows] = await Promise.all([
    d1
      .prepare('SELECT id, name FROM categories ORDER BY sort_order')
      .all<{ id: string; name: string }>(),
    d1
      .prepare('SELECT id, name FROM brands ORDER BY name')
      .all<{ id: string; name: string }>(),
  ]);
  return { categories: cats.results, brands: brandRows.results };
}

async function findAdminProduct(id: string) {
  const row = await getD1()
    .prepare('SELECT * FROM products WHERE id = ?')
    .bind(id)
    .first<Row>();
  return row ? toAdmin(row) : null;
}

function need(access: AdminAccess, permission: Permission) {
  if (!access.can(permission))
    throw new HttpError(
      403,
      'Your account is not allowed to make this change.',
    );
}

const UPLOADED = /^\/api\/product-images\/([a-f0-9-]{36})$/;

/** Deletes an uploaded R2 photo that is no longer used. Failures only log. */
async function removeUploadedPhoto(imageKey: string | null) {
  const id = imageKey?.match(UPLOADED)?.[1];
  const bucket = getPhotoBucket();
  if (!id || !bucket) return;
  try {
    await bucket.delete(`products/${id}`);
  } catch (error) {
    console.error('Could not remove an old product photo', error);
  }
}

const COLUMNS = [
  'name',
  'name_ar',
  'slug',
  'sku',
  'summary',
  'category_id',
  'brand_id',
  'part_type',
  'attributes',
  'price_baisa',
  'sale_price_baisa',
  'stock',
  'low_stock_threshold',
  'status',
  'featured',
  'image_key',
] as const;

function columnValues(input: ProductInput) {
  return [
    input.name,
    input.nameAr,
    input.slug,
    input.sku,
    input.summary,
    input.categoryId,
    input.brandId,
    input.partType,
    JSON.stringify(input.attributes),
    input.priceBaisa,
    input.salePriceBaisa,
    input.stock,
    input.lowStockThreshold,
    input.status,
    input.featured ? 1 : 0,
    input.imageKey,
  ];
}

export async function saveProduct(options: {
  access: AdminAccess;
  ip: string;
  input: ProductInput;
  /** Omit to create a product. */
  existing?: { id: string; version: string };
}) {
  const { access, ip, input, existing } = options;
  const d1 = getD1();
  const old = existing ? await findAdminProduct(existing.id) : null;
  if (existing && !old)
    throw new HttpError(404, 'This product no longer exists. Reload the list.');
  if (old && existing && String(old.updatedAt) !== existing.version)
    throw new HttpError(
      409,
      'Someone else changed this product. Reopen it to see the latest version.',
    );

  need(access, old ? 'products.edit' : 'products.create');
  if (
    (old?.status ?? 'DRAFT') !== input.status &&
    (input.status === 'PUBLISHED' || old?.status === 'PUBLISHED')
  )
    need(access, 'products.publish');
  if (old ? old.stock !== input.stock : input.stock > 0)
    need(access, 'inventory.edit');

  const [category, brand, duplicate] = await Promise.all([
    d1
      .prepare('SELECT id FROM categories WHERE id = ?')
      .bind(input.categoryId)
      .first(),
    input.brandId
      ? d1
          .prepare('SELECT id FROM brands WHERE id = ?')
          .bind(input.brandId)
          .first()
      : Promise.resolve(true),
    d1
      .prepare(
        'SELECT slug, sku FROM products WHERE id != ? AND (slug = ? OR sku = ?)',
      )
      .bind(old?.id ?? '', input.slug, input.sku)
      .first<{ slug: string; sku: string }>(),
  ]);
  if (!category)
    throw new HttpError(400, 'Choose a category from the list.', 'categoryId');
  if (!brand)
    throw new HttpError(400, 'Choose a brand from the list.', 'brandId');
  if (duplicate)
    throw duplicate.sku === input.sku
      ? new HttpError(409, 'Another product already uses this SKU.', 'sku')
      : new HttpError(
          409,
          'Another product already uses this web address (slug).',
          'slug',
        );

  const id = old?.id ?? crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  // Strictly newer than before, so every save gets a new version.
  const updatedAt = old ? Math.max(now, old.updatedAt / 1000 + 1) : now;
  const write = old
    ? d1
        .prepare(
          `UPDATE products SET ${COLUMNS.map((c) => `${c} = ?`).join(', ')}, updated_at = ? WHERE id = ? AND updated_at = ?`,
        )
        .bind(...columnValues(input), updatedAt, id, old.updatedAt / 1000)
    : d1
        .prepare(
          `INSERT INTO products (id, ${COLUMNS.join(', ')}, created_at, updated_at) VALUES (?, ${COLUMNS.map(() => '?').join(', ')}, ?, ?)`,
        )
        .bind(id, ...columnValues(input), now, now);

  // One batch: the change and its audit record succeed or fail together.
  const [result] = await d1.batch([
    write,
    auditStatement(
      {
        actorUserId: access.user.userId,
        action: old ? 'product.update' : 'product.create',
        resourceType: 'product',
        resourceId: id,
        before: old ? snapshot(old) : undefined,
        after: snapshot(input),
        ipAddress: ip,
      },
      true,
    ),
  ]);
  if (result.meta.changes !== 1)
    throw new HttpError(
      409,
      'Someone else changed this product. Reopen it to see the latest version.',
    );
  if (old && old.imageKey !== input.imageKey)
    await removeUploadedPhoto(old.imageKey);
  return (await findAdminProduct(id))!;
}

export async function deleteProduct(options: {
  access: AdminAccess;
  ip: string;
  id: string;
  version: string;
}) {
  const { access, ip, id, version } = options;
  need(access, 'products.delete');
  const old = await findAdminProduct(id);
  if (!old)
    throw new HttpError(404, 'This product no longer exists. Reload the list.');
  if (String(old.updatedAt) !== version)
    throw new HttpError(
      409,
      'Someone else changed this product. Reload before deleting.',
    );
  const d1 = getD1();
  const [result] = await d1.batch([
    d1
      .prepare('DELETE FROM products WHERE id = ? AND updated_at = ?')
      .bind(id, old.updatedAt / 1000),
    auditStatement(
      {
        actorUserId: access.user.userId,
        action: 'product.delete',
        resourceType: 'product',
        resourceId: id,
        before: snapshot(old),
        ipAddress: ip,
      },
      true,
    ),
  ]);
  if (result.meta.changes !== 1)
    throw new HttpError(
      409,
      'Someone else changed this product. Reload before deleting.',
    );
  await removeUploadedPhoto(old.imageKey);
}

export async function getOverview() {
  const d1 = getD1();
  const [counts, lowStock, activity] = await Promise.all([
    d1
      .prepare(
        `SELECT count(*) AS total,
          coalesce(sum(status = 'PUBLISHED'), 0) AS published,
          coalesce(sum(status = 'DRAFT'), 0) AS drafts,
          coalesce(sum(status = 'HIDDEN'), 0) AS hidden,
          coalesce(sum(stock <= low_stock_threshold), 0) AS low_stock
        FROM products`,
      )
      .first<{
        total: number;
        published: number;
        drafts: number;
        hidden: number;
        low_stock: number;
      }>(),
    d1
      .prepare(
        `SELECT id, name, sku, stock, low_stock_threshold FROM products
        WHERE stock <= low_stock_threshold ORDER BY stock, name LIMIT 8`,
      )
      .all<{
        id: string;
        name: string;
        sku: string;
        stock: number;
        low_stock_threshold: number;
      }>(),
    d1
      .prepare(
        `SELECT a.action, a.created_at, u.display_name AS actor, u.email AS actor_email,
          coalesce(p.name, json_extract(a.after, '$.name'), json_extract(a.before, '$.name')) AS product
        FROM audit_logs a
        LEFT JOIN users u ON u.id = a.actor_user_id
        LEFT JOIN products p ON a.resource_type = 'product' AND p.id = a.resource_id
        ORDER BY a.created_at DESC, a.rowid DESC LIMIT 12`,
      )
      .all<{
        action: string;
        created_at: number;
        actor: string | null;
        actor_email: string | null;
        product: string | null;
      }>(),
  ]);
  return {
    counts: counts ?? {
      total: 0,
      published: 0,
      drafts: 0,
      hidden: 0,
      low_stock: 0,
    },
    lowStock: lowStock.results,
    activity: activity.results,
  };
}
