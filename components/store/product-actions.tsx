'use client';

import clsx from 'clsx';
import { Heart, Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PublicProduct } from '@/lib/products';
import { Price } from '@/components/ui/bits';
import { Button } from '@/components/ui/button';
import { OrderOnWhatsApp } from './order-button';
import { useShop } from './shop-state';

/** Most one message orders; bigger orders are easy to agree on WhatsApp. */
const MAX_QUANTITY = 20;

/**
 * Quantity, "Order on WhatsApp" and Save on the product page. On phones, a
 * bar with the price and the same order button stays at the bottom of the
 * screen while these buttons are scrolled out of view.
 */
export function ProductActions({ product }: { product: PublicProduct }) {
  const shop = useShop();
  const [quantity, setQuantity] = useState(1);
  const [offScreen, setOffScreen] = useState(false);
  const row = useRef<HTMLDivElement>(null);
  const saved = shop.isSaved(product.id);
  const clamp = (value: number) => Math.max(1, Math.min(MAX_QUANTITY, value));

  useEffect(() => {
    const element = row.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) =>
      setOffScreen(!entry.isIntersecting),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <>
    <div ref={row} className="flex flex-wrap gap-2">
      <fieldset className="flex items-center rounded-md border border-line-strong">
        <legend className="sr-only">Quantity</legend>
        <button
          type="button"
          aria-label="One fewer"
          disabled={quantity <= 1}
          onClick={() => setQuantity((q) => clamp(q - 1))}
          className="grid size-12 place-items-center text-fg-muted hover:text-fg disabled:text-fg-subtle"
        >
          <Minus aria-hidden="true" className="size-4" />
        </button>
        <label htmlFor="quantity" className="sr-only">
          Quantity
        </label>
        <input
          id="quantity"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_QUANTITY}
          value={quantity}
          onChange={(event) =>
            setQuantity(clamp(Number(event.target.value) || 1))
          }
          className="w-12 bg-transparent text-center font-mono tabular [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label="One more"
          disabled={quantity >= MAX_QUANTITY}
          onClick={() => setQuantity((q) => clamp(q + 1))}
          className="grid size-12 place-items-center text-fg-muted hover:text-fg disabled:text-fg-subtle"
        >
          <Plus aria-hidden="true" className="size-4" />
        </button>
      </fieldset>
      <OrderOnWhatsApp
        product={product}
        quantity={quantity}
        className="min-w-0 flex-1"
      />
      <Button
        variant="secondary"
        size="lg"
        aria-pressed={saved}
        aria-label={saved ? 'Remove from saved items' : 'Save for later'}
        onClick={() => shop.toggleSaved(product)}
        className={clsx('w-12 justify-center px-0', saved && 'text-accent')}
      >
        <Heart
          aria-hidden="true"
          className={clsx('size-5', saved && 'fill-current')}
        />
      </Button>
    </div>
    <div
      inert={!offScreen}
      className={clsx(
        'fixed inset-x-0 bottom-0 z-40 border-t border-line-strong bg-ink-950/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-200 md:hidden',
        offScreen ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-fg-muted">
            {quantity > 1 ? `${quantity} × ` : ''}
            {product.name}
          </p>
          <Price
            priceBaisa={product.priceBaisa}
            salePriceBaisa={product.salePriceBaisa}
            size="md"
          />
        </div>
        <OrderOnWhatsApp product={product} quantity={quantity} size="md" />
      </div>
    </div>
    </>
  );
}
