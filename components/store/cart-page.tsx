'use client';

import { ShoppingBag, Trash2 } from 'lucide-react';
import { currentPrice, formatOMR, itemCount } from '@/lib/products';
import { buttonClass } from '@/components/ui/button';
import { Price, ProductImage, Stock } from '@/components/ui/bits';
import { Notice } from '@/components/ui/notice';
import { QuantityStepper } from './cart-panels';
import { useCart } from './cart-store';
import { WhatsAppChooser } from './whatsapp-chooser';

export function CartPage({ siteUrl }: { siteUrl: string }) {
  const cart = useCart();

  if (!cart.ready) {
    return (
      <p className="rounded-lg border border-line bg-ink-900 p-8 text-fg-muted">
        Loading your cart…
      </p>
    );
  }

  if (!cart.lines.length) {
    return (
      <div className="rounded-lg border border-line bg-ink-900 px-6 py-16 text-center">
        <ShoppingBag
          aria-hidden="true"
          className="mx-auto size-8 text-fg-subtle"
        />
        <h2 className="mt-4 text-xl font-semibold">Your cart is empty</h2>
        <p className="mt-2 text-fg-muted">
          Products you add are kept on this device.
        </p>
        <Notice
          message={cart.notice}
          className="mx-auto mt-4 max-w-md text-left"
        />
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="/categories/pc-components"
            className={buttonClass('primary')}
          >
            Shop components
          </a>
          <a href="/build" className={buttonClass('secondary')}>
            Build a PC
          </a>
        </div>
      </div>
    );
  }

  const message = () =>
    [
      "Hi, I'd like to order these items:",
      '',
      ...cart.lines.map(
        ({ product, quantity }) =>
          `• ${quantity} × ${product.name} (SKU ${product.sku}): ${formatOMR(currentPrice(product) * quantity)}`,
      ),
      '',
      `Subtotal on the website: ${formatOMR(cart.subtotalBaisa)}`,
      `From ${siteUrl}`,
    ].join('\n');

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div>
        <Notice message={cart.notice} className="mb-4" />
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-ink-900">
          {cart.lines.map((line) => (
            <li
              key={line.product.id}
              className="grid grid-cols-[5rem_1fr] gap-4 p-4 sm:grid-cols-[6rem_1fr_auto] sm:items-center sm:p-5"
            >
              <div className="aspect-square rounded-md bg-ink-850 p-2">
                <ProductImage product={line.product} size={96} decorative />
              </div>
              <div className="min-w-0">
                <a
                  href={`/products/${line.product.slug}`}
                  className="line-clamp-2 font-medium hover:text-accent"
                >
                  {line.product.name}
                </a>
                <p className="mt-1 font-mono text-xs text-fg-subtle">
                  SKU {line.product.sku}
                </p>
                <Price
                  priceBaisa={line.product.priceBaisa}
                  salePriceBaisa={line.product.salePriceBaisa}
                  size="sm"
                  className="mt-2"
                />
                <Stock
                  stock={line.product.stock}
                  onRequest={line.product.stockOnRequest}
                  className="mt-1"
                />
              </div>
              <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:flex-col sm:items-end">
                <p className="font-mono font-semibold tabular">
                  <span className="sr-only">Line total </span>
                  {formatOMR(currentPrice(line.product) * line.quantity)}
                </p>
                <div className="flex items-center gap-1">
                  <QuantityStepper line={line} />
                  <button
                    type="button"
                    aria-label={`Remove ${line.product.name}`}
                    onClick={() => cart.remove(line.product.id)}
                    className="grid size-11 place-items-center rounded-md text-fg-subtle hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside
        aria-labelledby="order-title"
        className="rounded-lg border border-line-strong bg-ink-900 lg:sticky lg:top-32"
      >
        <div className="border-b border-line px-5 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
            Order sheet
          </p>
          <h2 id="order-title" className="mt-1 text-lg font-semibold">
            {itemCount(cart.itemCount)}
          </h2>
        </div>
        <div className="flex items-baseline justify-between px-5 py-4">
          <span className="text-fg-muted">Subtotal</span>
          <span className="font-mono text-2xl font-semibold tabular">
            {formatOMR(cart.subtotalBaisa)}
          </span>
        </div>
        <div className="grid gap-3 border-t border-line p-5">
          <p className="text-sm leading-6 text-fg-muted">
            Online checkout is not available yet. Send your cart on WhatsApp and
            we will confirm stock, delivery and payment with you.
          </p>
          <WhatsAppChooser
            label="Order on WhatsApp"
            title="Send your cart"
            description="Choose who to send it to. Your items and subtotal are written for you."
            message={message}
          />
          <a
            href="/build"
            className={buttonClass('ghost', 'md', 'justify-center')}
          >
            Plan a full PC build
          </a>
        </div>
      </aside>
    </div>
  );
}
