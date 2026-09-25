'use client';

import clsx from 'clsx';
import { Heart, Minus, Plus } from 'lucide-react';
import { useState } from 'react';
import { formatOMR, currentPrice, type PublicProduct } from '@/lib/products';
import { Button } from '@/components/ui/button';
import { useCart } from './cart-store';
import { WhatsAppChooser } from './whatsapp-chooser';

/** Quantity, Add to cart, Save and "Ask on WhatsApp" on the product page. */
export function ProductActions({
  product,
  pageUrl,
}: {
  product: PublicProduct;
  pageUrl: string;
}) {
  const cart = useCart();
  const [quantity, setQuantity] = useState(1);
  const saved = cart.isWishlisted(product.id);
  const soldOut = product.stock < 1;
  const clamp = (value: number) =>
    Math.max(1, Math.min(product.stock || 1, value));

  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <fieldset className="flex items-center rounded-md border border-line-strong">
          <legend className="sr-only">Quantity</legend>
          <button
            type="button"
            aria-label="One fewer"
            disabled={soldOut || quantity <= 1}
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
            max={Math.max(1, product.stock)}
            value={quantity}
            disabled={soldOut}
            onChange={(event) =>
              setQuantity(clamp(Number(event.target.value) || 1))
            }
            className="w-12 bg-transparent text-center font-mono tabular [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            type="button"
            aria-label="One more"
            disabled={soldOut || quantity >= product.stock}
            onClick={() => setQuantity((q) => clamp(q + 1))}
            className="grid size-12 place-items-center text-fg-muted hover:text-fg disabled:text-fg-subtle"
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
        </fieldset>
        <Button
          size="lg"
          className="flex-1 justify-center"
          disabled={soldOut}
          onClick={() => cart.add(product, quantity)}
        >
          {soldOut ? 'Out of stock' : 'Add to cart'}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          aria-pressed={saved}
          aria-label={saved ? 'Remove from saved items' : 'Save for later'}
          onClick={() => cart.toggleWishlist(product)}
          className={clsx('w-12 justify-center px-0', saved && 'text-accent')}
        >
          <Heart
            aria-hidden="true"
            className={clsx('size-5', saved && 'fill-current')}
          />
        </Button>
      </div>
      <WhatsAppChooser
        label="Ask about this product on WhatsApp"
        title="Ask about this product"
        message={() =>
          [
            `Hi, I'm interested in: ${product.name}`,
            `SKU: ${product.sku}`,
            `Price on the website: ${formatOMR(currentPrice(product))}`,
            quantity > 1 ? `Quantity: ${quantity}` : '',
            pageUrl,
          ]
            .filter(Boolean)
            .join('\n')
        }
        variant="secondary"
      />
    </div>
  );
}
