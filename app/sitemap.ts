import type { MetadataRoute } from 'next';
import { LEGAL_DOCS } from '@/lib/legal';
import { getSitemapEntries } from '@/server/catalog/public';
import { getSiteUrl } from '@/server/site-url';

// Built from the live catalog on each request (and cached by crawlers), so a
// product added in the admin appears at once. Every entry has a lastmod.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [entries, siteUrl] = await Promise.all([
    getSitemapEntries(),
    getSiteUrl(),
  ]);
  const latest = (dates: Date[]) =>
    dates.length
      ? new Date(Math.max(...dates.map((date) => date.getTime())))
      : undefined;
  const legalUpdated = latest(
    LEGAL_DOCS.map((doc) => new Date(`${doc.updated}T00:00:00Z`)),
  );
  const catalogUpdated = latest(
    entries.products.map((product) => product.updatedAt),
  );

  const page = (
    path: string,
    lastModified: Date | undefined,
    priority: number,
    changeFrequency: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) => ({ url: `${siteUrl}${path}`, lastModified, changeFrequency, priority });

  return [
    page('', catalogUpdated, 1),
    page('/deals', catalogUpdated, 0.8),
    page('/build', catalogUpdated, 0.8, 'weekly'),
    ...entries.categories.map((category) =>
      page(
        `/categories/${category.slug}`,
        latest(
          entries.products
            .filter((product) => product.categorySlug === category.slug)
            .map((product) => product.updatedAt),
        ) ?? catalogUpdated,
        0.8,
      ),
    ),
    ...entries.products.map((product) =>
      page(`/products/${product.slug}`, product.updatedAt, 0.7, 'weekly'),
    ),
    // Policies: dated by their own version.
    ...LEGAL_DOCS.map((doc) =>
      page(doc.path, new Date(`${doc.updated}T00:00:00Z`), 0.3, 'monthly'),
    ),
    page('/legal', legalUpdated, 0.3, 'monthly'),
    page('/contact', legalUpdated, 0.4, 'monthly'),
  ];
}
