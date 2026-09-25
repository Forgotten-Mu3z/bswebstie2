import { notFound } from 'next/navigation';
import { attributeRows, partTypeLabel } from '@/lib/catalog';
import {
  currentPrice,
  formatOMR,
  PHOTO_NEEDED,
  type PublicProduct,
} from '@/lib/products';
import {
  breadcrumbLd,
  DEFAULT_OG_IMAGE,
  fitDescription,
  fitTitle,
  organizationId,
  pageMetadata,
} from '@/lib/seo';
import { estimateFps } from '@/lib/fps';
import { instagramPostDate } from '@/lib/source';
import { Eyebrow, Price, ProductImage, Stock } from '@/components/ui/bits';
import { FpsTable } from '@/components/ui/fps-table';
import { JsonLd } from '@/components/ui/json-ld';
import { ProductActions } from '@/components/store/product-actions';
import { ProductGrid } from '@/components/store/product-cell';
import { Section } from '@/components/store/section';
import { getProduct, getRelated } from '@/server/catalog/public';
import { getSiteUrl } from '@/server/site-url';

type Props = { params: Promise<{ slug: string }> };

/** 1200x630 share image made by scripts/make-brand-assets.mjs from the bundled photo. */
function shareImage(product: PublicProduct) {
  const slug = product.image?.match(/^\/products\/([a-z0-9-]+)\.webp$/)?.[1];
  return slug
    ? {
        url: `/og/products/${slug}.jpg`,
        width: 1200,
        height: 630,
        alt: product.name,
      }
    : DEFAULT_OG_IMAGE;
}

function crumbs(product: PublicProduct) {
  const items = [
    { name: product.category, path: `/categories/${product.categorySlug}` },
  ];
  if (product.partType && product.categorySlug === 'pc-components')
    items.push({
      name: partTypeLabel(product.partType, false) ?? '',
      path: `/categories/pc-components?type=${product.partType}`,
    });
  return [...items, { name: product.name, path: `/products/${product.slug}` }];
}

export async function generateMetadata({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) return { title: 'Product not found', robots: { index: false } };
  const kind =
    partTypeLabel(product.partType)?.toLowerCase() ??
    product.category.toLowerCase();
  return pageMetadata({
    title: fitTitle(product.name, [
      (c) => `${c}: Price, Specs & Stock in Oman | BLACKSHARK`,
      (c) => `${c}: Price & Specs in Oman | BLACKSHARK`,
      (c) => `${c} Price in Oman | BLACKSHARK`,
      (c) => `${c} | BLACKSHARK Oman`,
      (c) => `${c} | BLACKSHARK`,
    ]),
    description: fitDescription([
      product.summary,
      `${product.brand ? `${product.brand} ` : ''}${kind} for ${formatOMR(currentPrice(product))} in Oman.`,
      product.stockOnRequest
        ? 'Order on WhatsApp.'
        : product.stock > 0
          ? 'In stock now.'
          : 'Out of stock right now.',
    ]),
    path: `/products/${product.slug}`,
    image: shareImage(product),
  });
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const [related, siteUrl] = await Promise.all([
    getRelated(product),
    getSiteUrl(),
  ]);
  const pageUrl = `${siteUrl}/products/${product.slug}`;
  const typeLabel = partTypeLabel(product.partType);
  const postedOn = instagramPostDate(product.sourceUrl);
  // Gaming PCs and graphics cards get estimated FPS (from the specs in the name).
  const specText = `${product.name} ${product.summary}`;
  const fps =
    product.categorySlug === 'gaming-pcs' ||
    product.partType === 'graphics-card'
      ? estimateFps(
          specText,
          product.categorySlug === 'gaming-pcs' ? specText : '',
        )
      : null;

  const specs = [
    { label: 'Brand', value: product.brand ?? '—' },
    { label: 'Category', value: product.category },
    ...(typeLabel ? [{ label: 'Part type', value: typeLabel }] : []),
    { label: 'SKU', value: product.sku },
    ...attributeRows(product.attributes),
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${pageUrl}#product`,
    name: product.name,
    sku: product.sku,
    description: product.summary,
    category: typeLabel ?? product.category,
    image: `${siteUrl}${product.image ?? PHOTO_NEEDED}`,
    ...(product.brand
      ? { brand: { '@type': 'Brand', name: product.brand } }
      : {}),
    offers: {
      '@type': 'Offer',
      url: pageUrl,
      priceCurrency: 'OMR',
      price: (currentPrice(product) / 1000).toFixed(3),
      // Left out when stock is only confirmed on request.
      ...(product.stockOnRequest
        ? {}
        : {
            availability:
              product.stock > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
          }),
      seller: { '@id': organizationId(siteUrl) },
    },
  };

  return (
    <>
      <JsonLd data={[structuredData, breadcrumbLd(siteUrl, crumbs(product))]} />
      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 sm:py-12">
        <nav
          aria-label="Breadcrumb"
          className="font-mono text-xs text-fg-subtle"
        >
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <a href="/" className="hover:text-fg">
                Home
              </a>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <a
                href={`/categories/${product.categorySlug}`}
                className="hover:text-fg"
              >
                {product.category}
              </a>
            </li>
            {typeLabel && product.categorySlug === 'pc-components' ? (
              <>
                <li aria-hidden="true">/</li>
                <li>
                  <a
                    href={`/categories/pc-components?type=${product.partType}`}
                    className="hover:text-fg"
                  >
                    {partTypeLabel(product.partType, false)}
                  </a>
                </li>
              </>
            ) : null}
          </ol>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <div className="lg:sticky lg:top-32 lg:self-start">
            <div className="relative aspect-square overflow-hidden rounded-lg border border-line bg-ink-900">
              <div
                aria-hidden="true"
                className="blueprint absolute inset-0 opacity-60"
              />
              <div className="relative h-full p-8 sm:p-14">
                <ProductImage
                  product={product}
                  size={720}
                  sizes="(min-width: 1024px) 560px, 90vw"
                  priority
                />
              </div>
            </div>
          </div>

          <div>
            <Eyebrow>
              {[product.brand, typeLabel ?? product.category]
                .filter(Boolean)
                .join(' · ')}
            </Eyebrow>
            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-2 font-mono text-xs text-fg-subtle">
              SKU {product.sku}
            </p>

            <div className="mt-6 border-y border-line py-5">
              <Price
                priceBaisa={product.priceBaisa}
                salePriceBaisa={product.salePriceBaisa}
                size="lg"
              />
              <Stock
                stock={product.stock}
                onRequest={product.stockOnRequest}
                className="mt-2"
              />
              <p className="mt-3 text-sm text-fg-muted">
                Order on WhatsApp: pick who to message and your order is written
                for you.
              </p>
              {postedOn ? (
                <p className="mt-2 text-sm text-fg-muted">
                  Price from{' '}
                  <a
                    href={product.sourceUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline-offset-4 hover:underline"
                  >
                    our Instagram post
                  </a>{' '}
                  of {postedOn}. We confirm the current price and stock on
                  WhatsApp.
                </p>
              ) : null}
            </div>

            <div className="mt-6">
              <ProductActions product={product} />
            </div>

            <p className="mt-8 leading-7 text-fg-muted">{product.summary}</p>

            {fps ? (
              <div className="mt-8 rounded-lg border border-line bg-ink-900 p-4">
                <FpsTable estimate={fps} heading="h2" />
              </div>
            ) : null}

            <section aria-labelledby="spec-title" className="mt-8">
              <h2
                id="spec-title"
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-fg-subtle"
              >
                Spec sheet
              </h2>
              <dl className="mt-3 divide-y divide-line rounded-lg border border-line bg-ink-900">
                {specs.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[9rem_1fr] gap-4 px-4 py-3 text-sm"
                  >
                    <dt className="text-fg-subtle">{row.label}</dt>
                    <dd className="font-mono">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>
        </div>
      </div>

      {related.length ? (
        <Section
          eyebrow="More like this"
          title={
            typeLabel
              ? `Other ${partTypeLabel(product.partType, false)?.toLowerCase()}`
              : 'Related products'
          }
          href={
            product.partType && product.categorySlug === 'pc-components'
              ? `/categories/pc-components?type=${product.partType}`
              : `/categories/${product.categorySlug}`
          }
        >
          <ProductGrid products={related} />
        </Section>
      ) : null}
    </>
  );
}
