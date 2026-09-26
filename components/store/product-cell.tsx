'use client';

import clsx from 'clsx';
import { Eye, Heart } from 'lucide-react';
import { attributeRows, partTypeLabel } from '@/lib/catalog';
import { discountPercent, type PublicProduct } from '@/lib/products';
import { Button } from '@/components/ui/button';
import { Price, ProductImage, Stock } from '@/components/ui/bits';
import { OrderOnWhatsApp } from './order-button';
import { useShop } from './shop-state';

export function ProductCell({
  product,
  priority = false,
}: {
  product: PublicProduct;
  priority?: boolean;
}) {
  const shop = useShop();
  const saved = shop.isSaved(product.id);
  const discount = discountPercent(product);
  const keySpec = attributeRows(product.attributes)[0];
  const kind = [
    product.brand,
    partTypeLabel(product.partType) ?? product.category,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="group relative flex min-w-0 flex-col p-3 transition-colors hover:bg-ink-850 sm:p-4">
      <div className="relative">
        <a
          href={`/products/${product.slug}`}
          tabIndex={-1}
          aria-hidden="true"
          className="block aspect-square overflow-hidden rounded-md bg-ink-850 p-4 transition-colors group-hover:bg-ink-800 sm:p-6"
        >
          <ProductImage
            product={product}
            size={320}
            sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw"
            priority={priority}
            decorative
            className="transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </a>
        {discount ? (
          <span className="absolute left-2 top-2 rounded-sm bg-accent px-1.5 py-0.5 font-mono text-[11px] font-semibold text-accent-ink">
            −{discount}%
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => shop.toggleSaved(product)}
          aria-pressed={saved}
          aria-label={
            saved
              ? `Remove ${product.name} from saved items`
              : `Save ${product.name}`
          }
          className={clsx(
            'absolute right-1 top-1 grid size-11 place-items-center rounded-md transition-colors hover:bg-ink-700',
            saved ? 'text-accent' : 'text-fg-subtle hover:text-fg',
          )}
        >
          <Heart
            aria-hidden="true"
            className={clsx('size-[18px]', saved && 'fill-current')}
          />
        </button>
      </div>

      <p className="mt-3 truncate font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
        {kind}
      </p>
      <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-medium leading-5">
        <a href={`/products/${product.slug}`} className="hover:text-accent">
          {product.name}
        </a>
      </h3>
      {keySpec ? (
        <p className="mt-1.5 font-mono text-xs text-fg-muted">
          {keySpec.label}: <span className="text-fg">{keySpec.value}</span>
        </p>
      ) : null}

      <div className="mt-auto pt-3">
        <Price
          priceBaisa={product.priceBaisa}
          salePriceBaisa={product.salePriceBaisa}
          size="md"
        />
        <Stock
          stock={product.stock}
          onRequest={product.stockOnRequest}
          className="mt-1"
        />
        <div className="mt-3 flex gap-2">
          <OrderOnWhatsApp
            product={product}
            size="md"
            className="min-w-0 flex-1"
          />
          <Button
            variant="secondary"
            size="icon"
            aria-label={`Quick view: ${product.name}`}
            onClick={() => shop.showQuickView(product)}
          >
            <Eye aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  columns = 'default',
  priorityCount = 0,
  rail = false,
}: {
  products: PublicProduct[];
  columns?: 'default' | 'wide';
  priorityCount?: number;
  /** Phones: one swipeable row instead of a long grid. */
  rail?: boolean;
}) {
  const cells = products.map((product, index) => (
    <ProductCell
      key={product.id}
      product={product}
      priority={index < priorityCount}
    />
  ));
  if (rail)
    return (
      // Same ruled grid from tablets up (utilities, not .ruled, so the phone
      // layout can be a flex row).
      <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:snap-none md:grid-cols-3 md:gap-px md:overflow-hidden md:rounded-lg md:border md:border-line md:bg-line md:p-0 lg:grid-cols-4 [&::-webkit-scrollbar]:hidden">
        {cells.map((cell) => (
          <div
            key={cell.key}
            className="flex w-[46%] min-w-40 max-w-60 shrink-0 snap-start overflow-hidden rounded-lg border border-line bg-ink-900 *:flex-1 md:w-auto md:min-w-0 md:max-w-none md:rounded-none md:border-0"
          >
            {cell}
          </div>
        ))}
      </div>
    );
  return (
    <div
      className={clsx(
        'ruled rounded-lg overflow-hidden grid-cols-2',
        columns === 'wide'
          ? 'md:grid-cols-3 xl:grid-cols-5'
          : 'md:grid-cols-3 lg:grid-cols-4',
      )}
    >
      {cells}
    </div>
  );
}
