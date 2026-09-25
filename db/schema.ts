import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

const timestamp = (name: string) => integer(name, { mode: 'timestamp' });

// ---------------------------------------------------------------- catalog --

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
});

export const brands = sqliteTable('brands', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull().unique(),
});

export const products = sqliteTable(
  'products',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    sku: text('sku').notNull().unique(),
    name: text('name').notNull(),
    nameAr: text('name_ar').notNull().default(''),
    summary: text('summary').notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id),
    brandId: text('brand_id').references(() => brands.id),
    /** PC part type (see lib/catalog.ts); null for non-component products. */
    partType: text('part_type'),
    /** JSON: socket, memory, formFactor, wattage, psuWatts, sockets[]. */
    attributes: text('attributes').notNull().default('{}'),
    priceBaisa: integer('price_baisa').notNull(),
    salePriceBaisa: integer('sale_price_baisa'),
    stock: integer('stock').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(3),
    status: text('status', { enum: ['DRAFT', 'PUBLISHED', 'HIDDEN'] })
      .notNull()
      .default('DRAFT'),
    featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
    /** "/products/<slug>.webp" (bundled) or "/api/product-images/<uuid>" (R2). */
    imageKey: text('image_key'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    index('products_category_idx').on(table.categoryId, table.status),
    index('products_part_type_idx').on(table.partType),
  ],
);

// ------------------------------------------------------------------ staff --

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name').notNull().default(''),
  passwordHash: text('password_hash'),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' })
    .notNull()
    .default(true),
  passwordChangedAt: timestamp('password_changed_at'),
  /** AES-GCM sealed with TOTP_ENCRYPTION_KEY, bound to the user id. */
  totpSecret: text('totp_secret'),
  totpPendingSecret: text('totp_pending_secret'),
  /** Last accepted 30-second step, so a code cannot be used twice. */
  totpLastStep: integer('totp_last_step'),
  suspendedAt: timestamp('suspended_at'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  description: text('description').notNull(),
});

export const userRoles = sqliteTable(
  'user_roles',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

export const rolePermissions = sqliteTable(
  'role_permissions',
  {
    roleId: text('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionId] })],
);

/** Only a SHA-256 hash of each session token is stored. */
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    /** Null until the 2FA code is accepted; only then is it a full session. */
    mfaVerifiedAt: timestamp('mfa_verified_at'),
  },
  (table) => [index('sessions_user_idx').on(table.userId)],
);

/** Failed sign-in / 2FA / password attempts per key, for lockouts. */
export const loginFailures = sqliteTable('login_failures', {
  key: text('key').primaryKey(),
  failures: integer('failures').notNull().default(0),
  windowStart: integer('window_start').notNull(),
  lockedUntil: integer('locked_until'),
});

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    actorUserId: text('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    /** JSON snapshot before / after the change (never secrets). */
    before: text('before'),
    after: text('after'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => [index('audit_created_idx').on(table.createdAt)],
);
