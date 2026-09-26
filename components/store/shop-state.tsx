'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { PublicProduct } from '@/lib/products';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { ShopPanels } from './shop-panels';

// Saved items (kept on the shopper's device) and the quick-view dialog.
// There is no cart: every order is placed on WhatsApp.

type Panel = 'saved' | null;

type ShopApi = {
  saved: PublicProduct[];
  /** Plain-words note when saved items changed in the catalog. */
  notice: string;
  panel: Panel;
  quickView: PublicProduct | null;
  toggleSaved: (product: PublicProduct) => void;
  isSaved: (productId: string) => boolean;
  openPanel: (panel: Panel) => void;
  showQuickView: (product: PublicProduct | null) => void;
};

const ShopContext = createContext<ShopApi | null>(null);
const SAVED_KEY = STORAGE_KEYS.saved;
// The cart was removed; clear what older visits left behind.
const OLD_CART_KEY = STORAGE_KEYS.oldCart;

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

function loadSaved() {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter(isProduct) : [];
  } catch {
    return [];
  }
}

function store(value: PublicProduct[]) {
  try {
    // Nothing is kept in the browser until the shopper saves something.
    if (value.length) localStorage.setItem(SAVED_KEY, JSON.stringify(value));
    else localStorage.removeItem(SAVED_KEY);
    localStorage.removeItem(OLD_CART_KEY);
  } catch {
    // Private mode or full storage: saved items still work for this visit.
  }
}

export function ShopProvider({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<PublicProduct[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [panel, setPanel] = useState<Panel>(null);
  const [quickView, setQuickView] = useState<PublicProduct | null>(null);

  /* oxlint-disable react/react-compiler -- restore device state after hydration */
  useEffect(() => {
    const initial = loadSaved();
    setSaved(initial);
    setReady(true);
    if (!initial.length) return;
    // Refresh saved copies from the catalog (price, stock, still sold).
    const controller = new AbortController();
    fetch(
      `/api/products?ids=${encodeURIComponent(initial.map((p) => p.id).join(','))}`,
      { signal: controller.signal },
    )
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ products: PublicProduct[] }>)
          : Promise.reject(new Error('refresh failed')),
      )
      .then(({ products }) => {
        const fresh = new Map(products.map((product) => [product.id, product]));
        const gone = initial.filter((item) => !fresh.has(item.id));
        setSaved(initial.flatMap((item) => fresh.get(item.id) ?? []));
        if (gone.length)
          setNotice(
            `${gone.map((item) => item.name).join(', ')} ${gone.length === 1 ? 'is' : 'are'} no longer sold and ${gone.length === 1 ? 'was' : 'were'} removed.`,
          );
      })
      .catch(() => {
        // Offline: keep the saved copies for now.
      });
    return () => controller.abort();
  }, []);
  /* oxlint-enable react/react-compiler */

  useEffect(() => {
    if (ready) store(saved);
  }, [saved, ready]);

  const api = useMemo<ShopApi>(
    () => ({
      saved,
      notice,
      panel,
      quickView,
      toggleSaved(product) {
        setSaved((current) =>
          current.some((item) => item.id === product.id)
            ? current.filter((item) => item.id !== product.id)
            : [...current, product],
        );
      },
      isSaved: (productId) => saved.some((item) => item.id === productId),
      openPanel: setPanel,
      showQuickView: setQuickView,
    }),
    [saved, notice, panel, quickView],
  );

  return (
    <ShopContext.Provider value={api}>
      {children}
      <ShopPanels />
    </ShopContext.Provider>
  );
}

export function useShop() {
  const api = useContext(ShopContext);
  if (!api) throw new Error('useShop must be used inside ShopProvider');
  return api;
}
