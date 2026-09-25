import clsx from 'clsx';
import { SearchX } from 'lucide-react';
import type { PublicProduct } from '@/lib/products';
import type { FilterValues } from '@/server/catalog/filters';
import { Eyebrow } from '@/components/ui/bits';
import { buttonClass } from '@/components/ui/button';
import { CatalogFilters } from './catalog-filters';
import { ProductGrid } from './product-cell';

export type Chip = {
  label: string;
  href: string;
  count?: number;
  active: boolean;
};

/** Title, part-type chips, filters and the product grid. */
export function CatalogView({
  eyebrow,
  title,
  description,
  chips,
  products,
  filters,
  empty,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  chips?: Chip[];
  products: PublicProduct[];
  filters: {
    values: FilterValues;
    brands: { slug: string; name: string }[];
    action: string;
    active: number;
  };
  empty: { title: string; text: string };
}) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-14">
      <div className="border-b border-line pb-6">
        <Eyebrow>{eyebrow}</Eyebrow>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p
            className="font-mono text-sm text-fg-subtle tabular"
            aria-live="polite"
          >
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </p>
        </div>
        {description ? (
          <p className="mt-3 max-w-2xl text-fg-muted">{description}</p>
        ) : null}
      </div>

      {chips?.length ? (
        <nav
          aria-label="Part types"
          className="-mx-4 mt-5 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
            {chips.map((chip) => (
              <li key={chip.href}>
                <a
                  href={chip.href}
                  aria-current={chip.active ? 'page' : undefined}
                  className={clsx(
                    'inline-flex min-h-10 items-center gap-2 rounded-md border px-3 text-sm whitespace-nowrap transition-colors',
                    chip.active
                      ? 'border-accent bg-accent/10 text-fg'
                      : 'border-line-strong text-fg-muted hover:border-fg-subtle hover:text-fg',
                  )}
                >
                  {chip.label}
                  {chip.count !== undefined ? (
                    <span className="font-mono text-xs text-fg-subtle">
                      {chip.count}
                    </span>
                  ) : null}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <CatalogFilters {...filters} />
        <div className="min-w-0">
          {products.length ? (
            <>
              <h2 className="sr-only">Products</h2>
              <ProductGrid products={products} priorityCount={4} />
            </>
          ) : (
            <div className="grid place-items-center rounded-lg border border-dashed border-line-strong px-6 py-16 text-center">
              <SearchX aria-hidden="true" className="size-8 text-fg-subtle" />
              <h2 className="mt-4 text-lg font-semibold">{empty.title}</h2>
              <p className="mt-1 max-w-sm text-sm text-fg-muted">
                {empty.text}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {filters.active ? (
                  <a href={filters.action} className={buttonClass('secondary')}>
                    Clear filters
                  </a>
                ) : null}
                <a href="/search" className={buttonClass('primary')}>
                  Browse all products
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
