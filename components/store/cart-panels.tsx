'use client';

import { Heart, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { partTypeLabel } from '@/lib/catalog';
import { formatOMR, type PublicProduct } from '@/lib/products';
import { Button, buttonClass } from '@/components/ui/button';
import { Price, ProductImage, Stock } from '@/components/ui/bits';
import { Drawer, Modal } from '@/components/ui/overlay';
import { Notice } from '@/components/ui/notice';
import { useCart, type CartLine } from './cart-store';

export function QuantityStepper({
  line,
  compact = false,
}: {
  line: CartLine;
  compact?: boolean;
}) {
  const cart = useCart();
  const { product, quantity } = line;
  return (
    <div className="flex items-center rounded-md border border-line-strong">
      <button
        type="button"
        aria-label={`One fewer ${product.name}`}
        disabled={quantity <= 1}
        onClick={() => cart.setQuantity(product.id, quantity - 1)}
        className="grid size-11 place-items-center text-fg-muted hover:text-fg disabled:text-fg-subtle"
      >
        <Minus aria-hidden="true" className="size-4" />
      </button>
      <span
        className={`text-center font-mono text-sm tabular ${compact ? 'w-7' : 'w-9'}`}
        aria-label={`Quantity ${quantity}`}
      >
        {quantity}
      </span>
      <button
        type="button"
        aria-label={`One more ${product.name}`}
        disabled={quantity >= product.stock}
        onClick={() => cart.setQuantity(product.id, quantity + 1)}
        className="grid size-11 place-items-center text-fg-muted hover:text-fg disabled:text-fg-subtle"
      >
        <Plus aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

function Empty({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Heart;
  title: string;
  text: string;
}) {
  return (
    <div className="grid place-items-center px-6 py-16 text-center">
      <Icon aria-hidden="true" className="size-8 text-fg-subtle" />
      <p className="mt-4 font-semibold">{title}</p>
      <p className="mt-1 text-sm text-fg-muted">{text}</p>
    </div>
  );
}

function CartDrawer() {
  const cart = useCart();
  return (
    <Drawer
      open={cart.panel === 'cart'}
      onOpenChange={(open) => cart.openPanel(open ? 'cart' : null)}
      title="Cart"
      description="Saved on this device."
      footer={
        cart.lines.length ? (
          <div className="grid gap-3">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-fg-muted">Subtotal</span>
              <span className="font-mono text-lg font-semibold tabular">
                {formatOMR(cart.subtotalBaisa)}
              </span>
            </div>
            <a
              href="/cart"
              className={buttonClass('primary', 'lg', 'justify-center')}
            >
              View cart
            </a>
          </div>
        ) : null
      }
    >
      <Notice message={cart.notice} className="m-5 mb-0" />
      {cart.lines.length ? (
        <ul className="divide-y divide-line">
          {cart.lines.map((line) => (
            <li key={line.product.id} className="flex gap-4 px-5 py-4">
              <div className="size-20 shrink-0 rounded-md border border-line bg-ink-850 p-2">
                <ProductImage product={line.product} size={80} decorative />
              </div>
              <div className="min-w-0 flex-1">
                <a
                  href={`/products/${line.product.slug}`}
                  className="line-clamp-2 text-sm font-medium hover:text-accent"
                >
                  {line.product.name}
                </a>
                <Price
                  priceBaisa={line.product.priceBaisa}
                  salePriceBaisa={line.product.salePriceBaisa}
                  size="sm"
                  className="mt-1"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <QuantityStepper line={line} compact />
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
      ) : (
        <Empty
          icon={ShoppingBag}
          title="Your cart is empty"
          text="Add a product and it will show up here."
        />
      )}
    </Drawer>
  );
}

function WishlistDrawer() {
  const cart = useCart();
  return (
    <Drawer
      open={cart.panel === 'wishlist'}
      onOpenChange={(open) => cart.openPanel(open ? 'wishlist' : null)}
      title="Saved items"
      description="Your wishlist, kept on this device."
    >
      {cart.wishlist.length ? (
        <ul className="divide-y divide-line">
          {cart.wishlist.map((product) => (
            <li key={product.id} className="flex gap-4 px-5 py-4">
              <div className="size-20 shrink-0 rounded-md border border-line bg-ink-850 p-2">
                <ProductImage product={product} size={80} decorative />
              </div>
              <div className="min-w-0 flex-1">
                <a
                  href={`/products/${product.slug}`}
                  className="line-clamp-2 text-sm font-medium hover:text-accent"
                >
                  {product.name}
                </a>
                <Price
                  priceBaisa={product.priceBaisa}
                  salePriceBaisa={product.salePriceBaisa}
                  size="sm"
                  className="mt-1"
                />
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    disabled={product.stock < 1}
                    onClick={() => cart.add(product)}
                  >
                    {product.stock < 1 ? 'Out of stock' : 'Add to cart'}
                  </Button>
                  <button
                    type="button"
                    aria-label={`Remove ${product.name} from saved items`}
                    onClick={() => cart.toggleWishlist(product)}
                    className="grid size-11 place-items-center rounded-md text-fg-subtle hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty
          icon={Heart}
          title="Nothing saved yet"
          text="Tap the heart on a product to keep it here."
        />
      )}
    </Drawer>
  );
}

function QuickView({ product }: { product: PublicProduct | null }) {
  const cart = useCart();
  return (
    <Modal
      open={Boolean(product)}
      onOpenChange={(open) => !open && cart.showQuickView(null)}
      title={product?.name ?? ''}
      description={
        product
          ? [product.brand, partTypeLabel(product.partType)]
              .filter(Boolean)
              .join(' · ')
          : ''
      }
      className="max-w-2xl"
    >
      {product ? (
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="aspect-square rounded-md border border-line bg-ink-850 p-6">
            <ProductImage product={product} size={360} />
          </div>
          <div className="flex flex-col">
            <p className="text-sm leading-6 text-fg-muted">{product.summary}</p>
            <Price
              priceBaisa={product.priceBaisa}
              salePriceBaisa={product.salePriceBaisa}
              size="lg"
              className="mt-5"
            />
            <Stock stock={product.stock} className="mt-2" />
            <div className="mt-auto grid gap-2 pt-6">
              <Button
                size="lg"
                className="justify-center"
                disabled={product.stock < 1}
                onClick={() => cart.add(product)}
              >
                {product.stock < 1 ? 'Out of stock' : 'Add to cart'}
              </Button>
              <a
                href={`/products/${product.slug}`}
                className={buttonClass('secondary', 'lg', 'justify-center')}
              >
                Full details
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export function CartPanels() {
  const cart = useCart();
  return (
    <>
      <CartDrawer />
      <WishlistDrawer />
      <QuickView product={cart.quickView} />
    </>
  );
}
