import type { MetadataRoute } from 'next';
import { getSitemapEntries } from '@/server/catalog/public';
import { getSiteUrl } from '@/server/site-url';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [entries, siteUrl] = await Promise.all([
    getSitemapEntries(),
    getSiteUrl(),
  ]);
  const page = (path: string, priority: number) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: 'daily' as const,
    priority,
  });
  return [
    page('', 1),
    page('/deals', 0.8),
    page('/build', 0.8),
    ...entries.categories.map((category) =>
      page(`/categories/${category.slug}`, 0.8),
    ),
    ...entries.products.map((product) => ({
      url: `${siteUrl}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
