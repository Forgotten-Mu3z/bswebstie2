import clsx from 'clsx';
import {
  currentPrice,
  discountPercent,
  formatAmount,
  imageAlt,
  PHOTO_NEEDED,
} from '@/lib/products';

/** "OMR 148.668" with the regular price struck through when on sale. */
export function Price({
  priceBaisa,
  salePriceBaisa,
  size = 'md',
  className,
}: {
  priceBaisa: number;
  salePriceBaisa: number | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const price = currentPrice({ priceBaisa, salePriceBaisa });
  const onSale = price < priceBaisa;
  return (
    <div
      className={clsx(
        'flex flex-wrap items-baseline gap-x-2 font-mono tabular',
        className,
      )}
    >
      <span
        className={clsx(
          'font-semibold text-fg',
          size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-lg' : 'text-sm',
        )}
      >
        <span
          className={clsx(
            'mr-1 font-normal text-fg-muted',
            size === 'lg' ? 'text-base' : 'text-xs',
          )}
        >
          OMR
        </span>
        {formatAmount(price)}
      </span>
      {onSale ? (
        <>
          <del
            className={clsx(
              'text-fg-subtle',
              size === 'lg' ? 'text-base' : 'text-xs',
            )}
          >
            <span className="sr-only">Regular price OMR </span>
            {formatAmount(priceBaisa)}
          </del>
          <span className="rounded-sm bg-accent/12 px-1.5 py-0.5 text-[11px] font-semibold text-accent">
            −{discountPercent({ priceBaisa, salePriceBaisa })}%
          </span>
        </>
      ) : null}
    </div>
  );
}

/** Stock indicator: a dot plus words, never colour alone. */
export function Stock({
  stock,
  className,
}: {
  stock: number;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-mono text-xs',
        stock > 0 ? 'text-ok' : 'text-danger',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          'size-1.5 rounded-full',
          stock > 0 ? 'bg-ok' : 'bg-danger',
        )}
      />
      {stock > 0 ? `${stock} in stock` : 'Out of stock'}
    </span>
  );
}

const BUNDLED = /^\/products\/([a-z0-9-]+\.webp)$/;

/**
 * Product photo, or the honest "photo coming soon" placeholder. Bundled
 * photos come in 400, 800 and 1200px (scripts/make-brand-assets.mjs) and the
 * browser picks the smallest that is sharp enough; `sizes` says how wide the
 * image is shown (defaults to `size` pixels).
 */
export function ProductImage({
  product,
  size,
  sizes,
  priority = false,
  className,
  decorative = false,
}: {
  product: { name: string; image: string | null };
  size: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** When the product name is already next to it. */
  decorative?: boolean;
}) {
  const src = product.image ?? PHOTO_NEEDED;
  const file = src.match(BUNDLED)?.[1];
  return (
    // oxlint-disable-next-line nextjs/no-img-element -- pre-sized files; the Workers image endpoint does not resize
    <img
      src={file ? `/products/800/${file}` : src}
      srcSet={
        file
          ? `/products/400/${file} 400w, /products/800/${file} 800w, /products/${file} 1200w`
          : undefined
      }
      sizes={file ? (sizes ?? `${size}px`) : undefined}
      alt={decorative ? '' : imageAlt(product)}
      width={size}
      height={size}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      className={clsx('h-full w-full object-contain', className)}
    />
  );
}

/** Small uppercase mono label used across the spec-sheet design. */
export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={clsx(
        'font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle',
        className,
      )}
    >
      {children}
    </p>
  );
}
