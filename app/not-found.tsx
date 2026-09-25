import { ArrowRight, Cpu, Search } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import { getCategories } from '@/server/catalog/public';
import { isAdminSite } from '@/server/security/site';

export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  if (isAdminSite()) return <AdminNotFound />;
  const categories = await getCategories().catch(() => []);
  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div aria-hidden="true" className="blueprint absolute inset-0" />
        <div className="relative mx-auto max-w-2xl px-4 py-16 text-center sm:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
            Error · 404
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Page not found
          </h1>
          <p className="mx-auto mt-4 max-w-lg leading-7 text-fg-muted">
            This page does not exist or was moved. If you followed a product
            link, it may no longer be sold.
          </p>
          <search className="mx-auto mt-8 block max-w-lg">
            <form action="/search" method="get" className="flex gap-2">
              <label htmlFor="not-found-search" className="sr-only">
                Search products
              </label>
              <input
                id="not-found-search"
                name="q"
                type="search"
                placeholder="Search products, brands or SKU"
                className="h-12 min-w-0 flex-1 rounded-md border border-line-strong bg-ink-900 px-4"
              />
              <button
                type="submit"
                className={buttonClass('primary', 'lg', 'px-4')}
              >
                <Search aria-hidden="true" className="size-5" />
                <span className="sr-only sm:not-sr-only">Search</span>
              </button>
            </form>
          </search>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a href="/" className={buttonClass('secondary')}>
              Go to home
            </a>
            <a href="/build" className={buttonClass('secondary')}>
              <Cpu aria-hidden="true" className="size-4" /> Build a PC
            </a>
          </div>
        </div>
      </section>
      {categories.length ? (
        <nav
          aria-labelledby="nf-categories"
          className="mx-auto max-w-4xl px-4 py-12 sm:px-6"
        >
          <h2
            id="nf-categories"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle"
          >
            Shop by category
          </h2>
          <ul className="ruled mt-4 grid grid-cols-2 overflow-hidden rounded-lg border border-line sm:grid-cols-3">
            {categories.map((category) => (
              <li key={category.id}>
                <a
                  href={`/categories/${category.slug}`}
                  className="flex min-h-16 items-center justify-between gap-2 bg-ink-900 px-4 hover:bg-ink-850 hover:text-accent"
                >
                  {category.name}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-fg-subtle"
                  />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </>
  );
}

function AdminNotFound() {
  return (
    <main
      id="main"
      className="grid min-h-screen place-items-center px-4 text-center"
    >
      <div className="max-w-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
          Error · 404
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Page not found</h1>
        <p className="mt-3 text-fg-muted">This admin page does not exist.</p>
        <a href="/admin" className={buttonClass('primary', 'md', 'mt-6')}>
          Go to overview
        </a>
      </div>
    </main>
  );
}
