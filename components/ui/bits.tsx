import clsx from 'clsx';
import Image from 'next/image';
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

/** Product photo, or the honest "photo coming soon" placeholder. */
export function ProductImage({
  product,
  size,
  priority = false,
  className,
  decorative = false,
}: {
  product: { name: string; image: string | null };
  size: number;
  priority?: boolean;
  className?: string;
  /** When the product name is already next to it. */
  decorative?: boolean;
}) {
  const src = product.image ?? PHOTO_NEEDED;
  return (
    <Image
      src={src}
      alt={decorative ? '' : imageAlt(product)}
      width={size}
      height={size}
      priority={priority}
      unoptimized={src.startsWith('/api/') || src.endsWith('.svg')}
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
