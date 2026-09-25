import type { MetadataRoute } from 'next';
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
  const catalogUpdated = latest(
    entries.products.map((product) => product.updatedAt),
  );

  const page = (
    path: string,
    lastModified: Date | undefined,
    priority: number,
    changeFrequency: 'daily' | 'weekly' = 'daily',
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
  ];
}
