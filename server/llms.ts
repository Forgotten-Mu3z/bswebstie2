import { WHATSAPP_CONTACTS } from '@/lib/contacts';
import { partTypeLabel } from '@/lib/catalog';
import { currentPrice, formatOMR } from '@/lib/products';
import { INSTAGRAM_URL } from '@/lib/seo';
import { findProducts, getCategories } from '@/server/catalog/public';
import { notFound } from '@/server/security/http';
import { isAdminSite } from '@/server/security/site';
import { getSiteUrl } from '@/server/site-url';

// /llms.txt and /llms-full.txt (https://llmstxt.org): a plain summary of the
// store for language models, built from the live catalog.

const phone = (digits: string) =>
  `+${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;

async function header() {
  const siteUrl = await getSiteUrl();
  const categories = await getCategories();
  const lines = [
    '# BLACKSHARK',
    '',
    '> Gaming PC and computer parts store in Oman, also known as Black Shark Gaming or BS Gaming. Prices are in Omani rial (OMR) with live stock. There is no online checkout: customers order on WhatsApp from any product page or from the PC builder.',
    '',
    '## Key pages',
    '',
    `- [Home](${siteUrl}/): featured products, deals and new arrivals`,
    `- [PC builder](${siteUrl}/build): choose 8 parts step by step; only compatible parts are offered (socket, memory type, board size, power supply)`,
    `- [Deals](${siteUrl}/deals): products whose sale price is below the regular price`,
    `- [All products](${siteUrl}/search): the full catalog with filters`,
    '',
    '## Categories',
    '',
    ...categories.map(
      (category) =>
        `- [${category.name}](${siteUrl}/categories/${category.slug}): ${category.description} (${category.productCount} ${category.productCount === 1 ? 'product' : 'products'})`,
    ),
    '',
    '## Contact',
    '',
    ...WHATSAPP_CONTACTS.map(
      (contact) => `- WhatsApp: ${contact.name}, ${phone(contact.phone)}`,
    ),
    `- Instagram: ${INSTAGRAM_URL}`,
    '',
  ];
  return { siteUrl, categories, lines };
}

const text = (body: string) =>
  new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });

export async function llmsSummary() {
  if (isAdminSite()) return notFound();
  const { siteUrl, lines } = await header();
  return text(
    [
      ...lines,
      '## Optional',
      '',
      `- [Full product list with prices](${siteUrl}/llms-full.txt)`,
      `- [Sitemap](${siteUrl}/sitemap.xml)`,
      '',
    ].join('\n'),
  );
}

export async function llmsFull() {
  if (isAdminSite()) return notFound();
  const { siteUrl, categories, lines } = await header();
  const products = await findProducts({ sort: 'name', limit: 200 });
  const sections = categories.flatMap((category) => {
    const items = products.filter(
      (product) => product.categorySlug === category.slug,
    );
    if (!items.length) return [];
    return [
      `## ${category.name}`,
      '',
      ...items.map((product) => {
        const price = currentPrice(product);
        const facts = [
          price < product.priceBaisa
            ? `${formatOMR(price)} (regular ${formatOMR(product.priceBaisa)})`
            : formatOMR(price),
          product.brand,
          partTypeLabel(product.partType),
          product.stockOnRequest
            ? ''
            : product.stock > 0
              ? 'in stock'
              : 'out of stock',
          `SKU ${product.sku}`,
        ].filter(Boolean);
        return `- [${product.name}](${siteUrl}/products/${product.slug}): ${facts.join(' · ')}. ${product.summary}`;
      }),
      '',
    ];
  });
  return text(
    [
      ...lines,
      `Prices and stock as of ${new Date().toISOString().slice(0, 10)}. Check the product page for the current price.`,
      '',
      ...sections,
    ].join('\n'),
  );
}
