'use client';

import clsx from 'clsx';
import { Cpu, Heart, Menu, Search, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PART_TYPES } from '@/lib/catalog';
import { itemCount } from '@/lib/products';
import { Drawer } from '@/components/ui/overlay';
import { useCart } from './cart-store';
import { SearchPalette } from './search-palette';

export type NavCategory = { slug: string; name: string };

function Wordmark() {
  return (
    <a href="/" className="flex shrink-0 items-center gap-2.5 rounded-md">
      <Image
        src="/logo-96.png"
        alt=""
        width={40}
        height={40}
        unoptimized
        priority
        className="size-9 rounded-md sm:size-10"
      />
      <span className="sr-only sm:hidden">BLACKSHARK home</span>
      <span className="hidden leading-none sm:block">
        <span className="block text-[15px] font-bold tracking-[0.2em]">
          BLACKSHARK
        </span>
        <span className="mt-1 block font-mono text-[10px] tracking-[0.3em] text-fg-subtle">
          GAMING · OMAN
        </span>
      </span>
    </a>
  );
}

function Count({ value }: { value: number }) {
  return value ? (
    <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold leading-[18px] text-accent-ink">
      {value}
    </span>
  ) : null;
}

export function SiteHeader({ categories }: { categories: NavCategory[] }) {
  const cart = useCart();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Ctrl/Cmd+K or "/" opens search from anywhere (not while typing).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = (event.target as HTMLElement | null)?.closest(
        'input, textarea, select, [contenteditable]',
      );
      if (
        (event.key === 'k' && (event.metaKey || event.ctrlKey)) ||
        (event.key === '/' && !typing)
      ) {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const iconButton =
    'relative grid size-11 place-items-center rounded-md text-fg-muted hover:bg-ink-800 hover:text-fg';
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ink-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <button
          type="button"
          className={clsx(iconButton, 'lg:hidden')}
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
        <Wordmark />

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="mx-auto hidden h-10 w-full max-w-md items-center gap-3 rounded-md border border-line-strong bg-ink-900 px-3 text-left text-sm text-fg-subtle hover:border-fg-subtle md:flex"
        >
          <Search aria-hidden="true" className="size-4" />
          <span className="flex-1">Search products, brands or SKU</span>
          <kbd className="rounded-sm border border-line-strong px-1.5 font-mono text-[11px]">
            Ctrl K
          </kbd>
        </button>

        <nav
          aria-label="Your items"
          className="ml-auto flex items-center gap-1 md:ml-0"
        >
          <button
            type="button"
            className={clsx(iconButton, 'md:hidden')}
            aria-label="Search"
            onClick={() => setSearchOpen(true)}
          >
            <Search aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            className={iconButton}
            aria-label={`Saved items, ${itemCount(cart.wishlist.length)}`}
            onClick={() => cart.openPanel('wishlist')}
          >
            <Heart aria-hidden="true" className="size-5" />
            <Count value={cart.wishlist.length} />
          </button>
          <button
            type="button"
            className={iconButton}
            aria-label={`Cart, ${itemCount(cart.itemCount)}`}
            onClick={() => cart.openPanel('cart')}
          >
            <ShoppingBag aria-hidden="true" className="size-5" />
            <Count value={cart.itemCount} />
          </button>
        </nav>
      </div>

      <nav
        aria-label="Departments"
        className="hidden border-t border-line lg:block"
      >
        <div className="mx-auto flex h-11 max-w-[1400px] items-center gap-1 px-6 text-sm">
          {categories.map((category) => {
            const href = `/categories/${category.slug}`;
            return (
              <a
                key={category.slug}
                href={href}
                aria-current={isActive(href) ? 'page' : undefined}
                className={clsx(
                  'rounded-md px-3 py-1.5 hover:bg-ink-800 hover:text-fg',
                  isActive(href) ? 'text-fg' : 'text-fg-muted',
                )}
              >
                {category.name}
              </a>
            );
          })}
          <a
            href="/deals"
            aria-current={isActive('/deals') ? 'page' : undefined}
            className={clsx(
              'rounded-md px-3 py-1.5 hover:bg-ink-800 hover:text-fg',
              isActive('/deals') ? 'text-fg' : 'text-fg-muted',
            )}
          >
            Deals
          </a>
          <a
            href="/build"
            className="ml-auto inline-flex items-center gap-2 rounded-md border border-accent/40 px-3 py-1.5 font-medium text-accent hover:bg-accent/10"
          >
            <Cpu aria-hidden="true" className="size-4" /> Build a PC
          </a>
        </div>
      </nav>

      <SearchPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <Drawer
        open={menuOpen}
        onOpenChange={setMenuOpen}
        side="left"
        title="Menu"
      >
        <nav aria-label="Menu" className="grid gap-1 p-3">
          <a
            href="/build"
            className="flex h-12 items-center gap-2 rounded-md bg-accent px-4 font-semibold text-accent-ink"
          >
            <Cpu aria-hidden="true" className="size-4" /> Build a PC
          </a>
          <p className="mt-4 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
            Shop
          </p>
          {categories.map((category) => (
            <a
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="flex h-12 items-center rounded-md px-3 hover:bg-ink-800"
            >
              {category.name}
            </a>
          ))}
          <a
            href="/deals"
            className="flex h-12 items-center rounded-md px-3 hover:bg-ink-800"
          >
            Deals
          </a>
          <a
            href="/search"
            className="flex h-12 items-center rounded-md px-3 hover:bg-ink-800"
          >
            All products
          </a>
          <p className="mt-4 px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle">
            PC parts
          </p>
          <div className="grid grid-cols-2 gap-1">
            {PART_TYPES.slice(0, 8).map((type) => (
              <a
                key={type.value}
                href={`/categories/pc-components?type=${type.value}`}
                className="flex min-h-11 items-center rounded-md px-3 text-sm text-fg-muted hover:bg-ink-800 hover:text-fg"
              >
                {type.label}
              </a>
            ))}
          </div>
        </nav>
      </Drawer>
    </header>
  );
}
