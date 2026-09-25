'use client';

import { ImageUp, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  ATTRIBUTE_FIELDS,
  FORM_FACTORS,
  MEMORY_TYPES,
  PART_TYPES,
  SOCKETS,
  socketLabel,
  type Attributes,
  type PartType,
  type Socket,
} from '@/lib/catalog';
import type { AdminProduct } from '@/server/catalog/admin';
import type { Permission } from '@/server/security/admin';
import { Button } from '@/components/ui/button';
import { ProductImage } from '@/components/ui/bits';
import { Drawer } from '@/components/ui/overlay';
import { adminFetch } from './admin-api';

export type Lookups = {
  categories: { id: string; name: string }[];
  brands: { id: string; name: string }[];
};

type Draft = {
  name: string;
  nameAr: string;
  slug: string;
  sku: string;
  summary: string;
  categoryId: string;
  brandId: string;
  partType: PartType | '';
  attributes: Attributes;
  price: string;
  salePrice: string;
  stock: string;
  lowStockThreshold: string;
  status: AdminProduct['status'];
  featured: boolean;
  imageKey: string | null;
};

const omr = (baisa: number | null) =>
  baisa === null ? '' : (baisa / 1000).toFixed(3);

function toDraft(product: AdminProduct | null, lookups: Lookups): Draft {
  return {
    name: product?.name ?? '',
    nameAr: product?.nameAr ?? '',
    slug: product?.slug ?? '',
    sku: product?.sku ?? '',
    summary: product?.summary ?? '',
    categoryId: product?.categoryId ?? lookups.categories[0]?.id ?? '',
    brandId: product?.brandId ?? '',
    partType: product?.partType ?? '',
    attributes: product?.attributes ?? {},
    price: product ? omr(product.priceBaisa) : '',
    salePrice: product ? omr(product.salePriceBaisa) : '',
    stock: String(product?.stock ?? 0),
    lowStockThreshold: String(product?.lowStockThreshold ?? 3),
    status: product?.status ?? 'DRAFT',
    featured: product?.featured ?? false,
    imageKey: product?.imageKey ?? null,
  };
}

const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const PHOTO_MAX = 5 * 1024 * 1024;
const UPLOADED = /^\/api\/product-images\//;

const input =
  'h-11 w-full rounded-md border border-line-strong bg-ink-850 px-3 text-sm text-fg hover:border-fg-subtle aria-[invalid=true]:border-danger';

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid content-start gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function ProductEditor({
  open,
  product,
  lookups,
  permissions,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null = new product */
  product: AdminProduct | null;
  lookups: Lookups;
  permissions: Permission[];
  onClose: () => void;
  onSaved: (product: AdminProduct, message: string) => void;
}) {
  const [draft, setDraft] = useState(() => toDraft(product, lookups));
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [error, setError] = useState<{
    message: string;
    field?: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Photos uploaded in this editor that are not saved to a product yet.
  const unsaved = useRef(new Set<string>());
  const can = (permission: Permission) => permissions.includes(permission);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const fieldError = (field: string) =>
    error?.field === field ? error.message : undefined;
  const invalid = (field: string) =>
    error?.field === field ? true : undefined;
  const attributeFields = draft.partType
    ? (ATTRIBUTE_FIELDS[draft.partType] ?? [])
    : [];
  const setAttribute = <K extends keyof Attributes>(
    key: K,
    value: Attributes[K],
  ) =>
    setDraft((current) => ({
      ...current,
      attributes: { ...current.attributes, [key]: value },
    }));

  function discardUnsaved(keep: string | null) {
    for (const url of unsaved.current) {
      if (url === keep) continue;
      unsaved.current.delete(url);
      void adminFetch(`/api/admin/product-images`, {
        method: 'DELETE',
        json: { url },
      });
    }
  }

  function close() {
    discardUnsaved(null);
    onClose();
  }

  async function upload(file: File) {
    if (!PHOTO_TYPES.includes(file.type))
      return setError({
        field: 'image',
        message: 'Use a JPG, PNG, WebP or AVIF photo.',
      });
    if (file.size > PHOTO_MAX)
      return setError({
        field: 'image',
        message: 'Photos must be 5 MB or smaller.',
      });
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.set('image', file);
    const result = await adminFetch<{ url: string }>(
      '/api/admin/product-images',
      { method: 'POST', body },
    );
    setUploading(false);
    if (!result.ok)
      return setError({
        field: result.field ?? 'image',
        message: result.error,
      });
    discardUnsaved(null);
    unsaved.current.add(result.data.url);
    set('imageKey', result.data.url);
  }

  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const attributes = Object.fromEntries(
      Object.entries(draft.attributes).filter(([key]) =>
        attributeFields.includes(key as keyof Attributes),
      ),
    );
    const body = {
      ...draft,
      attributes,
      brandId: draft.brandId || null,
      partType: draft.partType || null,
    };
    const result = product
      ? await adminFetch<{ product: AdminProduct; message: string }>(
          `/api/admin/products/${product.id}`,
          {
            method: 'PATCH',
            json: { ...body, version: String(product.updatedAt) },
          },
        )
      : await adminFetch<{ product: AdminProduct; message: string }>(
          '/api/admin/products',
          {
            method: 'POST',
            json: body,
          },
        );
    setSaving(false);
    if (!result.ok) {
      setError({ message: result.error, field: result.field });
      if (result.field) document.getElementById(`pf-${result.field}`)?.focus();
      return;
    }
    unsaved.current.delete(result.data.product.imageKey ?? '');
    discardUnsaved(null);
    onSaved(result.data.product, result.data.message);
  }

  const publishLocked = !can('products.publish');
  const stockLocked = !can('inventory.edit');

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => !next && close()}
      title={product ? 'Edit product' : 'Add product'}
      description={
        product
          ? product.name
          : 'New products start as drafts until you publish them.'
      }
      className="w-[min(96vw,44rem)]"
      footer={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {error && !error.field ? (
            <p role="alert" className="mr-auto text-sm text-danger">
              {error.message}
            </p>
          ) : error ? (
            <p role="alert" className="mr-auto text-sm text-danger">
              Check the highlighted field.
            </p>
          ) : null}
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="product-form"
            disabled={saving || uploading}
          >
            {saving ? 'Saving…' : product ? 'Save changes' : 'Add product'}
          </Button>
        </div>
      }
    >
      <form
        id="product-form"
        onSubmit={save}
        noValidate
        className="grid gap-8 p-5"
      >
        <fieldset className="grid gap-4">
          <legend className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
            Basics
          </legend>
          <Field id="pf-name" label="Name" error={fieldError('name')}>
            <input
              id="pf-name"
              value={draft.name}
              maxLength={180}
              aria-invalid={invalid('name')}
              onChange={(event) => {
                const name = event.target.value;
                setDraft((current) => ({
                  ...current,
                  name,
                  slug: slugTouched ? current.slug : slugify(name),
                }));
              }}
              className={input}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="pf-slug"
              label="Web address (slug)"
              hint="Lowercase words joined by hyphens."
              error={fieldError('slug')}
            >
              <input
                id="pf-slug"
                value={draft.slug}
                maxLength={120}
                aria-invalid={invalid('slug')}
                onChange={(event) => {
                  setSlugTouched(true);
                  set('slug', event.target.value);
                }}
                className={`${input} font-mono`}
              />
            </Field>
            <Field id="pf-sku" label="SKU" error={fieldError('sku')}>
              <input
                id="pf-sku"
                value={draft.sku}
                maxLength={80}
                aria-invalid={invalid('sku')}
                onChange={(event) => set('sku', event.target.value)}
                className={`${input} font-mono`}
              />
            </Field>
          </div>
          <Field
            id="pf-summary"
            label="Summary"
            hint="One or two plain sentences. No claims you cannot back up."
            error={fieldError('summary')}
          >
            <textarea
              id="pf-summary"
              value={draft.summary}
              maxLength={1000}
              rows={3}
              aria-invalid={invalid('summary')}
              onChange={(event) => set('summary', event.target.value)}
              className={`${input} h-auto py-2 leading-6`}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="pf-categoryId"
              label="Category"
              error={fieldError('categoryId')}
            >
              <select
                id="pf-categoryId"
                value={draft.categoryId}
                aria-invalid={invalid('categoryId')}
                onChange={(event) => set('categoryId', event.target.value)}
                className={input}
              >
                {lookups.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="pf-brandId" label="Brand" error={fieldError('brandId')}>
              <select
                id="pf-brandId"
                value={draft.brandId}
                aria-invalid={invalid('brandId')}
                onChange={(event) => set('brandId', event.target.value)}
                className={input}
              >
                <option value="">No brand</option>
                {lookups.brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
            Specs for the PC builder
          </legend>
          <Field
            id="pf-partType"
            label="Part type"
            hint="Leave empty for products that are not PC parts."
            error={fieldError('partType')}
          >
            <select
              id="pf-partType"
              value={draft.partType}
              onChange={(event) =>
                set('partType', event.target.value as PartType | '')
              }
              className={input}
            >
              <option value="">Not a PC part</option>
              {PART_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.single}
                </option>
              ))}
            </select>
          </Field>
          {attributeFields.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {attributeFields.includes('socket') ? (
                <Field id="pf-socket" label="Socket">
                  <select
                    id="pf-socket"
                    value={draft.attributes.socket ?? ''}
                    onChange={(event) =>
                      setAttribute(
                        'socket',
                        (event.target.value || undefined) as Socket | undefined,
                      )
                    }
                    className={input}
                  >
                    <option value="">Not listed</option>
                    {SOCKETS.map((socket) => (
                      <option key={socket} value={socket}>
                        {socketLabel(socket)}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {attributeFields.includes('memory') ? (
                <Field id="pf-memory" label="Memory type">
                  <select
                    id="pf-memory"
                    value={draft.attributes.memory ?? ''}
                    onChange={(event) =>
                      setAttribute(
                        'memory',
                        (event.target.value ||
                          undefined) as Attributes['memory'],
                      )
                    }
                    className={input}
                  >
                    <option value="">Not listed</option>
                    {MEMORY_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {attributeFields.includes('formFactor') ? (
                <Field
                  id="pf-formFactor"
                  label={
                    draft.partType === 'case'
                      ? 'Largest board it fits'
                      : 'Form factor'
                  }
                >
                  <select
                    id="pf-formFactor"
                    value={draft.attributes.formFactor ?? ''}
                    onChange={(event) =>
                      setAttribute(
                        'formFactor',
                        (event.target.value ||
                          undefined) as Attributes['formFactor'],
                      )
                    }
                    className={input}
                  >
                    <option value="">Not listed</option>
                    {FORM_FACTORS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {attributeFields.includes('wattage') ? (
                <Field id="pf-wattage" label="Output (W)">
                  <input
                    id="pf-wattage"
                    inputMode="numeric"
                    value={draft.attributes.wattage ?? ''}
                    onChange={(event) =>
                      setAttribute(
                        'wattage',
                        Number(event.target.value) || undefined,
                      )
                    }
                    className={`${input} font-mono`}
                  />
                </Field>
              ) : null}
              {attributeFields.includes('psuWatts') ? (
                <Field id="pf-psuWatts" label="Recommended PSU (W)">
                  <input
                    id="pf-psuWatts"
                    inputMode="numeric"
                    value={draft.attributes.psuWatts ?? ''}
                    onChange={(event) =>
                      setAttribute(
                        'psuWatts',
                        Number(event.target.value) || undefined,
                      )
                    }
                    className={`${input} font-mono`}
                  />
                </Field>
              ) : null}
              {attributeFields.includes('sockets') ? (
                <fieldset className="grid gap-1.5 sm:col-span-2">
                  <legend className="mb-1.5 text-sm font-medium">
                    Supported sockets
                  </legend>
                  <div className="flex flex-wrap gap-x-5">
                    {SOCKETS.map((socket) => {
                      const list = draft.attributes.sockets ?? [];
                      return (
                        <label
                          key={socket}
                          className="flex min-h-11 items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={list.includes(socket)}
                            onChange={(event) =>
                              setAttribute(
                                'sockets',
                                event.target.checked
                                  ? [...list, socket]
                                  : list.filter((s) => s !== socket),
                              )
                            }
                            className="size-4 accent-[var(--color-accent)]"
                          />
                          {socketLabel(socket)}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              ) : null}
            </div>
          ) : null}
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
            Price and stock
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="pf-price"
              label="Price (OMR)"
              hint="For example 149.900"
              error={fieldError('price')}
            >
              <input
                id="pf-price"
                inputMode="decimal"
                value={draft.price}
                aria-invalid={invalid('price')}
                onChange={(event) => set('price', event.target.value)}
                className={`${input} font-mono`}
              />
            </Field>
            <Field
              id="pf-salePrice"
              label="Sale price (OMR)"
              hint="Only if it is really lower right now."
              error={fieldError('salePrice')}
            >
              <input
                id="pf-salePrice"
                inputMode="decimal"
                value={draft.salePrice}
                aria-invalid={invalid('salePrice')}
                onChange={(event) => set('salePrice', event.target.value)}
                className={`${input} font-mono`}
              />
            </Field>
            <Field
              id="pf-stock"
              label="In stock"
              hint={
                stockLocked ? 'Your account cannot change stock.' : undefined
              }
              error={fieldError('stock')}
            >
              <input
                id="pf-stock"
                inputMode="numeric"
                value={draft.stock}
                disabled={stockLocked}
                aria-invalid={invalid('stock')}
                onChange={(event) => set('stock', event.target.value)}
                className={`${input} font-mono`}
              />
            </Field>
            <Field
              id="pf-lowStockThreshold"
              label="Low-stock warning at"
              error={fieldError('lowStockThreshold')}
            >
              <input
                id="pf-lowStockThreshold"
                inputMode="numeric"
                value={draft.lowStockThreshold}
                aria-invalid={invalid('lowStockThreshold')}
                onChange={(event) =>
                  set('lowStockThreshold', event.target.value)
                }
                className={`${input} font-mono`}
              />
            </Field>
          </div>
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
            Photo
          </legend>
          <div className="flex flex-wrap items-start gap-4">
            <div className="size-32 shrink-0 rounded-md border border-line bg-ink-850 p-2">
              <ProductImage
                product={{
                  name: draft.name || 'New product',
                  image: draft.imageKey,
                }}
                size={128}
              />
            </div>
            <div className="grid min-w-0 flex-1 gap-2">
              <label
                htmlFor="pf-image"
                className="inline-flex h-11 w-fit cursor-pointer items-center gap-2 rounded-md border border-line-strong bg-ink-850 px-4 text-sm font-semibold hover:bg-ink-800 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
              >
                <ImageUp aria-hidden="true" className="size-4" />
                {uploading
                  ? 'Uploading…'
                  : draft.imageKey
                    ? 'Replace photo'
                    : 'Upload photo'}
                <input
                  id="pf-image"
                  type="file"
                  accept={PHOTO_TYPES.join(',')}
                  disabled={uploading}
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void upload(file);
                  }}
                />
              </label>
              {draft.imageKey ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-fit"
                  onClick={() => set('imageKey', null)}
                >
                  <Trash2 aria-hidden="true" className="size-4" /> Remove photo
                </Button>
              ) : null}
              {fieldError('image') ? (
                <p className="text-sm text-danger">{fieldError('image')}</p>
              ) : (
                <p className="text-xs leading-5 text-fg-subtle">
                  JPG, PNG, WebP or AVIF, up to 5 MB. Only use photos you have
                  the right to use.
                  {draft.imageKey && !UPLOADED.test(draft.imageKey)
                    ? ' This photo ships with the website.'
                    : ''}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="mb-3 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
            Visibility
          </legend>
          <Field
            id="pf-status"
            label="Status"
            hint={
              publishLocked
                ? 'Your account cannot publish or unpublish.'
                : 'Only published products appear in the store.'
            }
            error={fieldError('status')}
          >
            <select
              id="pf-status"
              value={draft.status}
              onChange={(event) =>
                set('status', event.target.value as Draft['status'])
              }
              className={input}
            >
              <option value="DRAFT">Draft</option>
              <option
                value="PUBLISHED"
                disabled={publishLocked && product?.status !== 'PUBLISHED'}
              >
                Published
              </option>
              <option value="HIDDEN">Hidden</option>
            </select>
          </Field>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={draft.featured}
              onChange={(event) => set('featured', event.target.checked)}
              className="size-4 accent-[var(--color-accent)]"
            />
            Feature on the home page
          </label>
        </fieldset>
      </form>
    </Drawer>
  );
}
