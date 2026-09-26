'use client';

import clsx from 'clsx';
import { Cpu, Heart, House, LayoutGrid, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { itemCount } from '@/lib/products';
import { useShop } from './shop-state';

// Phones only: an app-style bar at the bottom of the screen, within thumb
// reach. Product pages show their "Order on WhatsApp" bar there instead.

const tab =
  'relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium';

export function MobileTabBar({
  onSearch,
  onMenu,
}: {
  onSearch: () => void;
  onMenu: () => void;
}) {
  const shop = useShop();
  const pathname = usePathname();
  if (pathname.startsWith('/products/')) return null;
  const shopping = ['/categories', '/search', '/deals'].some((path) =>
    pathname.startsWith(path),
  );
  const tone = (active: boolean) => (active ? 'text-accent' : 'text-fg-muted');

  return (
    <nav
      aria-label="Quick links"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line-strong bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch px-2">
        <a
          href="/"
          aria-current={pathname === '/' ? 'page' : undefined}
          className={clsx(tab, tone(pathname === '/'))}
        >
          <House aria-hidden="true" className="size-5" />
          Home
        </a>
        <button
          type="button"
          onClick={onMenu}
          className={clsx(tab, tone(shopping))}
        >
          <LayoutGrid aria-hidden="true" className="size-5" />
          Shop
        </button>
        <a
          href="/build"
          aria-current={pathname === '/build' ? 'page' : undefined}
          className={clsx(tab, 'text-fg')}
        >
          <span
            className={clsx(
              '-mt-5 grid size-12 place-items-center rounded-full border-4 border-ink-950 bg-accent text-accent-ink shadow-lg shadow-accent/30',
              pathname === '/build' && 'ring-2 ring-accent/50',
            )}
          >
            <Cpu aria-hidden="true" className="size-5" />
          </span>
          Build
        </a>
        <button
          type="button"
          onClick={onSearch}
          className={clsx(tab, 'text-fg-muted')}
        >
          <Search aria-hidden="true" className="size-5" />
          Search
        </button>
        <button
          type="button"
          onClick={() => shop.openPanel('saved')}
          aria-label={`Saved, ${itemCount(shop.saved.length)}`}
          className={clsx(tab, 'text-fg-muted')}
        >
          <Heart aria-hidden="true" className="size-5" />
          Saved
          {shop.saved.length ? (
            <span className="absolute right-[calc(50%-1.25rem)] top-1.5 grid min-w-[18px] place-items-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold leading-[18px] text-accent-ink">
              {shop.saved.length}
            </span>
          ) : null}
        </button>
      </div>
    </nav>
  );
}
