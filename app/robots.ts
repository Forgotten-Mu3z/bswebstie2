import type { MetadataRoute } from 'next';
import { isAdminSite } from '@/server/security/site';
import { getSiteUrl } from '@/server/site-url';

// Search engines and AI crawlers are welcome on the store. They are named
// explicitly so the rules stay open even if a platform-wide default changes.
const CRAWLERS = [
  'Googlebot',
  'Bingbot',
  'Applebot',
  'DuckDuckBot',
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Amazonbot',
  'meta-externalagent',
];

// Nothing to index behind these: JSON endpoints.
const PRIVATE = ['/api/'];

export default async function robots(): Promise<MetadataRoute.Robots> {
  // The admin site is never indexed. The store does not name admin paths,
  // because they do not exist there.
  if (isAdminSite()) return { rules: [{ userAgent: '*', disallow: '/' }] };
  return {
    rules: [
      { userAgent: CRAWLERS, allow: '/', disallow: PRIVATE },
      { userAgent: '*', allow: '/', disallow: PRIVATE },
    ],
    sitemap: `${await getSiteUrl()}/sitemap.xml`,
  };
}
