'use client';

import clsx from 'clsx';
import { Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { partTypeLabel } from '@/lib/catalog';
import { formatOMR } from '@/lib/products';
import type { AdminProduct } from '@/server/catalog/admin';
import type { Permission } from '@/server/security/admin';
import { Eyebrow, ProductImage } from '@/components/ui/bits';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/overlay';
import { Notice } from '@/components/ui/notice';
import { adminFetch } from './admin-api';
import { ProductEditor, type Lookups } from './product-editor';

type Filters = { q: string; status: string; lowStock: boolean };

const STATUS_STYLE: Record<AdminProduct['status'], string> = {
  PUBLISHED: 'border-ok/40 text-ok',
  DRAFT: 'border-line-strong text-fg-muted',
  HIDDEN: 'border-warn/40 text-warn',
};
const STATUS_LABEL: Record<AdminProduct['status'], string> = {
  PUBLISHED: 'Published',
  DRAFT: 'Draft',
  HIDDEN: 'Hidden',
};

const control =
  'h-11 rounded-md border border-line-strong bg-ink-900 px-3 text-sm hover:border-fg-subtle';

function StatusBadge({ status }: { status: AdminProduct['status'] }) {
  return (
    <span
      className={clsx(
        'inline-flex rounded-sm border px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider',
        STATUS_STYLE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const isLow = (product: AdminProduct) =>
  !product.stockOnRequest && product.stock <= product.lowStockThreshold;

function StockCell({ product }: { product: AdminProduct }) {
  if (product.stockOnRequest)
    return <span className="font-mono text-warn">Ask</span>;
  const low = isLow(product);
  return (
    <span
      className={clsx(
        'font-mono tabular',
        product.stock < 1 ? 'text-danger' : low ? 'text-warn' : undefined,
      )}
    >
      {product.stock}
      {low ? <span className="sr-only"> (low stock)</span> : null}
    </span>
  );
}

function PriceCell({ product }: { product: AdminProduct }) {
  return product.salePriceBaisa !== null ? (
    <span className="grid font-mono text-sm tabular">
      <span>{formatOMR(product.salePriceBaisa)}</span>
      <del className="text-xs text-fg-subtle">
        {formatOMR(product.priceBaisa)}
      </del>
    </span>
  ) : (
    <span className="font-mono text-sm tabular">
      {formatOMR(product.priceBaisa)}
    </span>
  );
}

export function ProductManager({
  initialProducts,
  lookups,
  permissions,
  initialFilters,
}: {
  initialProducts: AdminProduct[];
  lookups: Lookups;
  permissions: Permission[];
  initialFilters: Filters & { category?: string };
}) {
  const [products, setProducts] = useState(initialProducts);
  const [filters, setFilters] = useState<Filters & { category: string }>({
    category: '',
    ...initialFilters,
  });
  // undefined = closed, null = new product
  const [editing, setEditing] = useState<
    { product: AdminProduct | null; key: number } | undefined
  >();
  const [deleting, setDeleting] = useState<AdminProduct | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const can = (permission: Permission) => permissions.includes(permission);

  const categoryName = useMemo(
    () => new Map(lookups.categories.map((c) => [c.id, c.name])),
    [lookups],
  );
  const shown = useMemo(() => {
    const needle = filters.q.trim().toLowerCase();
    return products.filter(
      (product) =>
        (!needle ||
          `${product.name} ${product.sku} ${product.slug}`
            .toLowerCase()
            .includes(needle)) &&
        (!filters.status || product.status === filters.status) &&
        (!filters.category || product.categoryId === filters.category) &&
        (!filters.lowStock || isLow(product)),
    );
  }, [products, filters]);

  function saved(product: AdminProduct, message: string) {
    setProducts((current) =>
      current.some((item) => item.id === product.id)
        ? current.map((item) => (item.id === product.id ? product : item))
        : [product, ...current],
    );
    setEditing(undefined);
    setNotice(`${message} ${product.name}`);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    setDeleteError('');
    const result = await adminFetch<{ message: string }>(
      `/api/admin/products/${deleting.id}`,
      {
        method: 'DELETE',
        json: { version: String(deleting.updatedAt) },
      },
    );
    setBusy(false);
    if (!result.ok) return setDeleteError(result.error);
    setProducts((current) => current.filter((item) => item.id !== deleting.id));
    setNotice(`Deleted ${deleting.name}.`);
    setDeleting(null);
  }

  const open = (product: AdminProduct | null) =>
    setEditing({ product, key: Date.now() });

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Catalog</Eyebrow>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Products
          </h1>
        </div>
        {can('products.create') ? (
          <Button onClick={() => open(null)}>
            <Plus aria-hidden="true" className="size-4" /> Add product
          </Button>
        ) : null}
      </div>

      <search className="mt-6 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
          />
          <label htmlFor="admin-q" className="sr-only">
            Search by name or SKU
          </label>
          <input
            id="admin-q"
            type="search"
            value={filters.q}
            placeholder="Search by name or SKU"
            onChange={(event) =>
              setFilters((f) => ({ ...f, q: event.target.value }))
            }
            className={clsx(control, 'w-full pl-9')}
          />
        </div>
        <label className="sr-only" htmlFor="admin-status">
          Status
        </label>
        <select
          id="admin-status"
          value={filters.status}
          onChange={(event) =>
            setFilters((f) => ({ ...f, status: event.target.value }))
          }
          className={control}
        >
          <option value="">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="HIDDEN">Hidden</option>
        </select>
        <label className="sr-only" htmlFor="admin-category">
          Category
        </label>
        <select
          id="admin-category"
          value={filters.category}
          onChange={(event) =>
            setFilters((f) => ({ ...f, category: event.target.value }))
          }
          className={control}
        >
          <option value="">All categories</option>
          {lookups.categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <label
          className={clsx(control, 'flex cursor-pointer items-center gap-2')}
        >
          <input
            type="checkbox"
            checked={filters.lowStock}
            onChange={(event) =>
              setFilters((f) => ({ ...f, lowStock: event.target.checked }))
            }
            className="size-4 accent-[var(--color-accent)]"
          />
          Low stock
        </label>
      </search>

      <Notice message={notice} className="mt-4" />
      <p className="mt-4 text-sm text-fg-subtle" aria-live="polite">
        Showing {shown.length} of {products.length}
      </p>

      {shown.length ? (
        <>
          {/* Wide screens: table */}
          <div className="mt-3 hidden overflow-hidden rounded-lg border border-line md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-900 font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                <tr>
                  <th scope="col" className="px-4 py-3 font-normal">
                    Product
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    Category
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    Price
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    Stock
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-normal">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map((product) => (
                  <tr key={product.id} className="bg-ink-950 hover:bg-ink-900">
                    {/* oxlint-disable-next-line jsx-a11y/control-has-associated-label -- the name and SKU inside are the label */}
                    <th scope="row" className="px-4 py-3 font-normal">
                      <div className="flex items-center gap-3">
                        <span className="size-12 shrink-0 rounded bg-ink-850 p-1">
                          <ProductImage
                            product={{
                              name: product.name,
                              image: product.imageKey,
                            }}
                            size={48}
                            decorative
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="line-clamp-1 font-medium">
                              {product.name}
                            </span>
                            {product.featured ? (
                              <Star
                                aria-label="Featured"
                                className="size-3.5 shrink-0 fill-accent text-accent"
                              />
                            ) : null}
                          </span>
                          <span className="font-mono text-xs text-fg-subtle">
                            {product.sku}
                          </span>
                        </span>
                      </div>
                    </th>
                    <td className="px-4 py-3 text-fg-muted">
                      {categoryName.get(product.categoryId)}
                      {product.partType ? (
                        <span className="block text-xs text-fg-subtle">
                          {partTypeLabel(product.partType)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <PriceCell product={product} />
                    </td>
                    <td className="px-4 py-3">
                      <StockCell product={product} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {can('products.edit') ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${product.name}`}
                            onClick={() => open(product)}
                          >
                            <Pencil aria-hidden="true" className="size-4" />
                          </Button>
                        ) : null}
                        {can('products.delete') ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Delete ${product.name}`}
                            onClick={() => setDeleting(product)}
                            className="hover:text-danger"
                          >
                            <Trash2 aria-hidden="true" className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: cards */}
          <ul className="mt-3 grid gap-2 md:hidden">
            {shown.map((product) => (
              <li
                key={product.id}
                className="rounded-lg border border-line bg-ink-900 p-3"
              >
                <div className="flex gap-3">
                  <span className="size-16 shrink-0 rounded bg-ink-850 p-1">
                    <ProductImage
                      product={{ name: product.name, image: product.imageKey }}
                      size={64}
                      decorative
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium">
                      {product.name}
                    </p>
                    <p className="font-mono text-xs text-fg-subtle">
                      {product.sku}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <PriceCell product={product} />
                      <span className="text-fg-subtle">
                        Stock <StockCell product={product} />
                      </span>
                      <StatusBadge status={product.status} />
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {can('products.edit') ? (
                    <Button
                      variant="secondary"
                      className="justify-center"
                      onClick={() => open(product)}
                    >
                      <Pencil aria-hidden="true" className="size-4" /> Edit
                    </Button>
                  ) : null}
                  {can('products.delete') ? (
                    <Button
                      variant="danger"
                      className="justify-center"
                      onClick={() => setDeleting(product)}
                    >
                      <Trash2 aria-hidden="true" className="size-4" /> Delete
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 rounded-lg border border-line bg-ink-900 p-8 text-center text-fg-muted">
          No products match these filters.
        </p>
      )}

      {editing ? (
        <ProductEditor
          key={editing.key}
          open
          product={editing.product}
          lookups={lookups}
          permissions={permissions}
          onClose={() => setEditing(undefined)}
          onSaved={saved}
        />
      ) : null}

      <Modal
        open={Boolean(deleting)}
        onOpenChange={(next) => {
          if (!next) {
            setDeleting(null);
            setDeleteError('');
          }
        }}
        title="Delete this product?"
        description={
          deleting
            ? `${deleting.name} (${deleting.sku}) will be removed from the store and the admin. This cannot be undone.`
            : ''
        }
        footer={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {deleteError ? (
              <p role="alert" className="mr-auto text-sm text-danger">
                {deleteError}
              </p>
            ) : null}
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button variant="danger" disabled={busy} onClick={confirmDelete}>
              {busy ? 'Deleting…' : 'Delete product'}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-fg-muted">
          If you only want to take it off the store for now, edit it and set the
          status to Hidden instead.
        </p>
      </Modal>
    </>
  );
}
