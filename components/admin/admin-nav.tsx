'use client';

import clsx from 'clsx';
import { KeyRound, LayoutGrid, Package } from 'lucide-react';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Overview', icon: LayoutGrid },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/security', label: 'Security', icon: KeyRound },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="-mb-px flex gap-1 overflow-x-auto">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active =
          href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
        return (
          <a
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-sm',
              active
                ? 'border-accent text-fg'
                : 'border-transparent text-fg-muted hover:text-fg',
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </a>
        );
      })}
    </nav>
  );
}
