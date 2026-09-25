import type { Metadata } from 'next';
import { WHATSAPP_CONTACTS } from './contacts';

// Page metadata in one shape for every public page: a 50-60 character title,
// a 140-160 character description, a self-referencing canonical (made absolute
// by metadataBase, i.e. SITE_URL once a domain is set), Open Graph and Twitter.

export const SITE_NAME = 'BLACKSHARK';
export const INSTAGRAM_URL = 'https://www.instagram.com/blackshark__gaming/';
export const DEFAULT_OG_IMAGE = {
  url: '/og/default.png',
  width: 1200,
  height: 630,
  alt: 'BLACKSHARK: gaming PCs, PC parts and gaming gear in Oman',
};

const TITLE = { min: 50, max: 60 };
const DESCRIPTION = { min: 140, max: 160 };

function shorten(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.:;|–-]+$/, '')}…`;
}

/**
 * The first variant that lands in 50-60 characters, else the longest one
 * under 60, else the last variant with `core` shortened to fit.
 */
export function fitTitle(core: string, variants: ((core: string) => string)[]) {
  const titles = variants.map((variant) => variant(core));
  const fits = titles.find(
    (t) => t.length >= TITLE.min && t.length <= TITLE.max,
  );
  if (fits) return fits;
  const shorter = titles
    .filter((t) => t.length <= TITLE.max)
    .sort((a, b) => b.length - a.length)[0];
  if (shorter) return shorter;
  const last = variants[variants.length - 1];
  const room = TITLE.max - last('').length;
  return last(shorten(core, room));
}

// Extra sentences to reach 140 characters. Each group adds one sentence (the
// longest that still fits) unless the text already covers that point.
const FILLERS: { covered: RegExp; options: string[] }[] = [
  {
    covered: /OMR|price/i,
    options: ['Prices in OMR with live stock.', 'Prices in OMR.'],
  },
  {
    covered: /WhatsApp/i,
    options: ['Order on WhatsApp from BLACKSHARK, Oman.', 'Order on WhatsApp.'],
  },
  {
    covered: /builder|fit/i,
    options: [
      'Check that parts fit with the PC builder.',
      'Build a PC that fits.',
    ],
  },
  { covered: /stock/i, options: ['Stock is shown live.', 'Live stock.'] },
  {
    covered: /BLACKSHARK/,
    options: ['Shop at BLACKSHARK in Oman.', 'BLACKSHARK, Oman.'],
  },
];

/** Joins sentences, then adds filler sentences, until it is 140-160 characters. */
export function fitDescription(sentences: string[]) {
  const parts = sentences
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (parts[0] && parts[0].length > DESCRIPTION.max)
    return shorten(parts[0], DESCRIPTION.max);
  let text = '';
  const add = (part: string) => {
    const next = text ? `${text} ${part}` : part;
    if (next.length > DESCRIPTION.max) return false;
    text = next;
    return true;
  };
  for (const part of parts) if (text.length < DESCRIPTION.min) add(part);
  for (const filler of FILLERS) {
    if (text.length >= DESCRIPTION.min) break;
    if (filler.covered.test(text)) continue;
    filler.options.some(add);
  }
  return text;
}

type Image = { url: string; width: number; height: number; alt: string };

export function pageMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  noindex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: Image;
  noindex?: boolean;
}): Metadata {
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      locale: 'en_OM',
      title,
      description,
      url: path,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: image.url, alt: image.alt }],
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

// --- JSON-LD ---------------------------------------------------------------

export const organizationId = (siteUrl: string) => `${siteUrl}/#organization`;

export function organizationLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': organizationId(siteUrl),
    name: SITE_NAME,
    alternateName: ['Black Shark Gaming', 'BS Gaming'],
    url: siteUrl,
    logo: `${siteUrl}/icon-512.png`,
    sameAs: [INSTAGRAM_URL],
    contactPoint: WHATSAPP_CONTACTS.map((contact) => ({
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: `+${contact.phone}`,
      areaServed: 'OM',
    })),
  };
}

export function websiteLd(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    name: SITE_NAME,
    url: siteUrl,
    publisher: { '@id': organizationId(siteUrl) },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbLd(
  siteUrl: string,
  items: { name: string; path: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...items].map(
      (item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: `${siteUrl}${item.path === '/' ? '' : item.path}`,
      }),
    ),
  };
}

export function itemListLd(
  siteUrl: string,
  name: string,
  paths: { name: string; path: string }[],
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: paths.length,
    itemListElement: paths.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      url: `${siteUrl}${entry.path}`,
    })),
  };
}
