'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { currentPrice, formatOMR, type PublicProduct } from '@/lib/products';
import { CartPanels } from './cart-panels';

// Cart and wishlist live on the shopper's device (localStorage). Saved copies
// are refreshed from the catalog on every visit, and changes are explained.

export type CartLine = { product: PublicProduct; quantity: number };

type Panel = 'cart' | 'wishlist' | null;

type CartApi = {
  /** False until the saved cart has been read from this device. */
  ready: boolean;
  lines: CartLine[];
  wishlist: PublicProduct[];
  itemCount: number;
  subtotalBaisa: number;
  notice: string;
  panel: Panel;
  quickView: PublicProduct | null;
  add: (product: PublicProduct, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  toggleWishlist: (product: PublicProduct) => void;
  isWishlisted: (productId: string) => boolean;
  openPanel: (panel: Panel) => void;
  showQuickView: (product: PublicProduct | null) => void;
};

const CartContext = createContext<CartApi | null>(null);
const CART_KEY = 'bsg-cart-v1';
const WISHLIST_KEY = 'bsg-wishlist-v1';

function isProduct(value: unknown): value is PublicProduct {
  const p = value as Partial<PublicProduct> | null;
  return Boolean(
    p &&
    typeof p.id === 'string' &&
    typeof p.slug === 'string' &&
    typeof p.name === 'string' &&
    typeof p.priceBaisa === 'number' &&
    typeof p.stock === 'number',
  );
}

function load<T>(key: string, check: (value: unknown) => value is T): T[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]');
    return Array.isArray(value) ? value.filter(check) : [];
  } catch {
    return [];
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or full storage: the cart still works for this visit.
  }
}

const isLine = (value: unknown): value is CartLine =>
  Boolean(
    value &&
    isProduct((value as CartLine).product) &&
    Number.isInteger((value as CartLine).quantity) &&
    (value as CartLine).quantity > 0,
  );

/** What changed between saved copies and the live catalog, in plain words. */
function describeChanges(saved: CartLine[], fresh: Map<string, PublicProduct>) {
  return saved.flatMap(({ product: old, quantity }) => {
    const now = fresh.get(old.id);
    if (!now) return [`${old.name} is no longer sold and was removed.`];
    if (now.stock < 1) return [`${now.name} is out of stock and was removed.`];
    const notes: string[] = [];
    if (quantity > now.stock)
      notes.push(
        `${now.name}: only ${now.stock} left, so your quantity was lowered.`,
      );
    if (currentPrice(now) !== currentPrice(old))
      notes.push(
        `${now.name} is now ${formatOMR(currentPrice(now))} (was ${formatOMR(currentPrice(old))}).`,
      );
    return notes;
  });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<PublicProduct[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [quickView, setQuickView] = useState<PublicProduct | null>(null);

  /* oxlint-disable react/react-compiler -- restore device state after hydration */
  useEffect(() => {
    const savedLines = load(CART_KEY, isLine);
    const savedWishlist = load(WISHLIST_KEY, isProduct);
    setLines(savedLines);
    setWishlist(savedWishlist);
    setReady(true);

    const ids = [
      ...new Set([
        ...savedLines.map((l) => l.product.id),
        ...savedWishlist.map((p) => p.id),
      ]),
    ];
    if (!ids.length) return;
    const controller = new AbortController();
    fetch(`/api/products?ids=${encodeURIComponent(ids.join(','))}`, {
      signal: controller.signal,
    })
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ products: PublicProduct[] }>)
          : Promise.reject(new Error('refresh failed')),
      )
      .then(({ products }: { products: PublicProduct[] }) => {
        const fresh = new Map(products.map((product) => [product.id, product]));
        setLines((current) =>
          current.flatMap((line) => {
            const product = fresh.get(line.product.id);
            return product && product.stock > 0
              ? [{ product, quantity: Math.min(line.quantity, product.stock) }]
              : [];
          }),
        );
        setWishlist((current) =>
          current.flatMap((item) => fresh.get(item.id) ?? []),
        );
        const changes = describeChanges(savedLines, fresh);
        if (changes.length) setNotice(changes.join(' '));
      })
      .catch(() => {
        // Offline: keep the saved copies for now.
      });
    return () => controller.abort();
  }, []);
  /* oxlint-enable react/react-compiler */

  useEffect(() => {
    if (ready) save(CART_KEY, lines);
  }, [lines, ready]);
  useEffect(() => {
    if (ready) save(WISHLIST_KEY, wishlist);
  }, [wishlist, ready]);

  const api = useMemo<CartApi>(() => {
    const inCart = (id: string) =>
      lines.find((line) => line.product.id === id)?.quantity ?? 0;
    return {
      ready,
      lines,
      wishlist,
      notice,
      panel,
      quickView,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotalBaisa: lines.reduce(
        (sum, line) => sum + currentPrice(line.product) * line.quantity,
        0,
      ),
      add(product, quantity = 1) {
        if (product.stock < 1) return;
        const already = inCart(product.id);
        const wanted = already + Math.max(1, quantity);
        const next = Math.min(product.stock, wanted);
        setNotice(
          already >= product.stock
            ? `Your cart already has all ${product.stock} in stock of ${product.name}.`
            : wanted > product.stock
              ? `Only ${product.stock} of ${product.name} are in stock. Your cart now has all of them.`
              : `${product.name} added to your cart.`,
        );
        setLines((current) =>
          current.some((line) => line.product.id === product.id)
            ? current.map((line) =>
                line.product.id === product.id
                  ? { product, quantity: next }
                  : line,
              )
            : [...current, { product, quantity: next }],
        );
        setQuickView(null);
        setPanel('cart');
      },
      setQuantity(productId, quantity) {
        setLines((current) =>
          current.map((line) =>
            line.product.id === productId
              ? {
                  ...line,
                  quantity: Math.max(1, Math.min(line.product.stock, quantity)),
                }
              : line,
          ),
        );
      },
      remove(productId) {
        setLines((current) =>
          current.filter((line) => line.product.id !== productId),
        );
      },
      toggleWishlist(product) {
        setWishlist((current) =>
          current.some((item) => item.id === product.id)
            ? current.filter((item) => item.id !== product.id)
            : [...current, product],
        );
      },
      isWishlisted: (productId) =>
        wishlist.some((item) => item.id === productId),
      openPanel: setPanel,
      showQuickView: setQuickView,
    };
  }, [ready, lines, wishlist, notice, panel, quickView]);

  return (
    <CartContext.Provider value={api}>
      {children}
      <CartPanels />
    </CartContext.Provider>
  );
}

export function useCart() {
  const api = useContext(CartContext);
  if (!api) throw new Error('useCart must be used inside CartProvider');
  return api;
}
