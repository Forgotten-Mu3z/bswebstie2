import { env } from 'cloudflare:workers';
import { ExternalLink, LogOut } from 'lucide-react';
import Image from 'next/image';
import { AdminNav } from './admin-nav';

/** Frame for signed-in admin pages. `nav` is off while a temporary password must be changed. */
export function AdminShell({
  email,
  nav = true,
  children,
}: {
  email: string;
  nav?: boolean;
  children: React.ReactNode;
}) {
  const storeUrl = env.STORE_URL?.replace(/\/+$/, '');
  return (
    <>
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-accent px-4 py-3 font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-line bg-ink-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 pt-3 sm:px-6">
          <a href="/admin" className="flex items-center gap-2.5">
            <Image
              src="/logo-96.png"
              unoptimized
              alt=""
              width={28}
              height={28}
              className="rounded"
            />
            <span className="font-semibold tracking-tight">BLACKSHARK</span>
            <span className="rounded-sm border border-accent/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
              Admin
            </span>
          </a>
          <div className="ml-auto flex items-center gap-1">
            <span
              className="hidden max-w-56 truncate text-sm text-fg-subtle md:inline"
              title={email}
            >
              {email}
            </span>
            {storeUrl ? (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm text-fg-muted hover:bg-ink-800 hover:text-fg"
              >
                <ExternalLink aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">View store</span>
                <span className="sr-only sm:hidden">View store</span>
              </a>
            ) : null}
            <form method="post" action="/api/auth/sign-out">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-3 text-sm text-fg-muted hover:bg-ink-800 hover:text-fg"
              >
                <LogOut aria-hidden="true" className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
                <span className="sr-only sm:hidden">Sign out</span>
              </button>
            </form>
          </div>
        </div>
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          {nav ? <AdminNav /> : <div className="h-3" />}
        </div>
      </header>
      <main
        id="main"
        className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-10"
      >
        {children}
      </main>
    </>
  );
}
