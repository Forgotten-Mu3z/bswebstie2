'use client';

import { Heart, Trash2 } from 'lucide-react';
import { partTypeLabel } from '@/lib/catalog';
import type { PublicProduct } from '@/lib/products';
import { buttonClass } from '@/components/ui/button';
import { Price, ProductImage, Stock } from '@/components/ui/bits';
import { Drawer, Modal } from '@/components/ui/overlay';
import { Notice } from '@/components/ui/notice';
import { OrderOnWhatsApp } from './order-button';
import { useShop } from './shop-state';

function SavedDrawer() {
  const shop = useShop();
  return (
    <Drawer
      open={shop.panel === 'saved'}
      onOpenChange={(open) => shop.openPanel(open ? 'saved' : null)}
      title="Saved items"
      description="Kept on this device. Order any of them on WhatsApp."
    >
      <Notice message={shop.notice} className="m-5 mb-0" />
      {shop.saved.length ? (
        <ul className="divide-y divide-line">
          {shop.saved.map((product) => (
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
                  <OrderOnWhatsApp product={product} size="md" />
                  <button
                    type="button"
                    aria-label={`Remove ${product.name} from saved items`}
                    onClick={() => shop.toggleSaved(product)}
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
        <div className="grid place-items-center px-6 py-16 text-center">
          <Heart aria-hidden="true" className="size-8 text-fg-subtle" />
          <p className="mt-4 font-semibold">Nothing saved yet</p>
          <p className="mt-1 text-sm text-fg-muted">
            Tap the heart on a product to keep it here.
          </p>
        </div>
      )}
    </Drawer>
  );
}

function QuickView({ product }: { product: PublicProduct | null }) {
  const shop = useShop();
  return (
    <Modal
      open={Boolean(product)}
      onOpenChange={(open) => !open && shop.showQuickView(null)}
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
            <Stock
              stock={product.stock}
              onRequest={product.stockOnRequest}
              className="mt-2"
            />
            <div className="mt-auto grid gap-2 pt-6">
              <OrderOnWhatsApp product={product} />
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

export function ShopPanels() {
  const shop = useShop();
  return (
    <>
      <SavedDrawer />
      <QuickView product={shop.quickView} />
    </>
  );
}
