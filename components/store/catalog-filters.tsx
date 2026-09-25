'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { SORTS } from '@/lib/catalog';
import type { FilterValues } from '@/server/catalog/filters';
import { Button, buttonClass } from '@/components/ui/button';
import { Drawer } from '@/components/ui/overlay';

type Brand = { slug: string; name: string };

const field =
  'h-11 w-full rounded-md border border-line-strong bg-ink-900 px-3 text-sm text-fg hover:border-fg-subtle';

function Fields({
  values,
  brands,
  idPrefix,
  autoSubmit,
}: {
  values: FilterValues;
  brands: Brand[];
  idPrefix: string;
  autoSubmit: (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  return (
    <div className="grid gap-5">
      {values.q ? <input type="hidden" name="q" value={values.q} /> : null}
      {values.type ? (
        <input type="hidden" name="type" value={values.type} />
      ) : null}
      <div className="grid gap-2">
        <label htmlFor={id('sort')} className="text-sm font-medium">
          Sort by
        </label>
        <select
          id={id('sort')}
          name="sort"
          defaultValue={values.sort}
          onChange={autoSubmit}
          className={field}
        >
          {Object.entries(SORTS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {brands.length > 1 ? (
        <div className="grid gap-2">
          <label htmlFor={id('brand')} className="text-sm font-medium">
            Brand
          </label>
          <select
            id={id('brand')}
            name="brand"
            defaultValue={values.brand}
            onChange={autoSubmit}
            className={field}
          >
            <option value="">All brands</option>
            {brands.map((brand) => (
              <option key={brand.slug} value={brand.slug}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">Price (OMR)</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className="sr-only" htmlFor={id('min')}>
            Minimum price in OMR
          </label>
          <input
            id={id('min')}
            name="min"
            inputMode="decimal"
            placeholder="Min"
            defaultValue={values.min}
            pattern="\d{1,6}(\.\d{1,3})?"
            className={field}
          />
          <label className="sr-only" htmlFor={id('max')}>
            Maximum price in OMR
          </label>
          <input
            id={id('max')}
            name="max"
            inputMode="decimal"
            placeholder="Max"
            defaultValue={values.max}
            pattern="\d{1,6}(\.\d{1,3})?"
            className={field}
          />
        </div>
      </fieldset>
      <div className="grid gap-1">
        {[
          ['stock', 'In stock only', values.stock],
          ['sale', 'On sale', values.sale],
        ].map(([name, label, checked]) => (
          <label
            key={String(name)}
            className="flex min-h-11 cursor-pointer items-center gap-3 text-sm"
          >
            <input
              type="checkbox"
              name={String(name)}
              value="1"
              defaultChecked={Boolean(checked)}
              onChange={autoSubmit}
              className="size-4 accent-[var(--color-accent)]"
            />
            {label}
          </label>
        ))}
      </div>
      <Button type="submit" variant="secondary" className="justify-center">
        Apply
      </Button>
    </div>
  );
}

/** Desktop sidebar + mobile drawer with the same filter form. */
export function CatalogFilters({
  values,
  brands,
  action,
  active,
}: {
  values: FilterValues;
  brands: Brand[];
  action: string;
  active: number;
}) {
  const [open, setOpen] = useState(false);
  const autoSubmit = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => event.currentTarget.form?.requestSubmit();
  const resetHref = values.q
    ? `${action}?q=${encodeURIComponent(values.q)}`
    : action;

  return (
    <>
      <div className="flex items-center gap-2 lg:hidden">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <SlidersHorizontal aria-hidden="true" className="size-4" />
          Filters{active ? ` (${active})` : ''} · Sort
        </Button>
        {active ? (
          <a href={resetHref} className={buttonClass('ghost')}>
            Clear
          </a>
        ) : null}
      </div>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        side="left"
        title="Filter and sort"
      >
        <form action={action} method="get" className="p-5">
          <Fields
            values={values}
            brands={brands}
            idPrefix="m"
            autoSubmit={() => undefined}
          />
        </form>
      </Drawer>
      <aside aria-label="Filters" className="hidden lg:block">
        <form
          action={action}
          method="get"
          className="sticky top-32 rounded-lg border border-line bg-ink-900 p-5"
        >
          <div className="mb-5 flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
              Filter
            </p>
            {active ? (
              <a
                href={resetHref}
                className="text-sm text-fg-muted hover:text-accent"
              >
                Clear all
              </a>
            ) : null}
          </div>
          <Fields
            values={values}
            brands={brands}
            idPrefix="d"
            autoSubmit={autoSubmit}
          />
        </form>
      </aside>
    </>
  );
}
