'use client';

import clsx from 'clsx';
import { Heart, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import type { PublicProduct } from '@/lib/products';
import { Button } from '@/components/ui/button';
import { OrderOnWhatsApp } from './order-button';
import { useShop } from './shop-state';

/** Most one message orders; bigger orders are easy to agree on WhatsApp. */
const MAX_QUANTITY = 20;

/** Quantity, "Order on WhatsApp" and Save on the product page. */
export function ProductActions({ product }: { product: PublicProduct }) {
  const shop = useShop();
  const [quantity, setQuantity] = useState(1);
  const saved = shop.isSaved(product.id);
  const clamp = (value: number) => Math.max(1, Math.min(MAX_QUANTITY, value));

  return (
    <div className="flex flex-wrap gap-2">
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
  );
}
