import type { MetadataRoute } from 'next';
import { isAdminSite } from '@/server/security/site';
import { getSiteUrl } from '@/server/site-url';

export default async function robots(): Promise<MetadataRoute.Robots> {
  // The admin site is never indexed. The store does not name admin paths,
  // because they do not exist there.
  if (isAdminSite()) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/cart'] }],
    sitemap: `${await getSiteUrl()}/sitemap.xml`,
  };
}
