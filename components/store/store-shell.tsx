import { getCategories } from '@/server/catalog/public';
import { ShopProvider } from './shop-state';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

/** Header, footer and saved items for every store page (and the store's 404). */
export async function StoreShell({ children }: { children: React.ReactNode }) {
  // The shell must render even if the catalog is briefly unavailable.
  const categories = await getCategories()
    .then((rows) => rows.map(({ slug, name }) => ({ slug, name })))
    .catch(() => []);
  return (
    <ShopProvider>
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-accent px-4 py-3 font-semibold text-accent-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <SiteHeader categories={categories} />
      <main id="main" className="min-h-[60vh]">
        {children}
      </main>
      <SiteFooter categories={categories} />
      {/* Room for the phone's bottom bar, so it never covers the footer. */}
      <div
        aria-hidden="true"
        className="h-[calc(4.5rem+env(safe-area-inset-bottom))] md:hidden"
      />
    </ShopProvider>
  );
}
