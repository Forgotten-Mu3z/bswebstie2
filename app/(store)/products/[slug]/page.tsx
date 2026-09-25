import { notFound } from 'next/navigation';
import { attributeRows, partTypeLabel } from '@/lib/catalog';
import { currentPrice, PHOTO_NEEDED } from '@/lib/products';
import { Eyebrow, Price, ProductImage, Stock } from '@/components/ui/bits';
import { ProductActions } from '@/components/store/product-actions';
import { ProductGrid } from '@/components/store/product-cell';
import { Section } from '@/components/store/section';
import { getProduct, getRelated } from '@/server/catalog/public';
import { getSiteUrl } from '@/server/site-url';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) return { title: 'Product not found' };
  return {
    title: product.name,
    description: product.summary,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.summary,
      url: `/products/${product.slug}`,
      images: product.image
        ? [{ url: product.image, alt: product.name }]
        : undefined,
    },
  };
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
    name: product.name,
    sku: product.sku,
    description: product.summary,
    image: `${siteUrl}${product.image ?? PHOTO_NEEDED}`,
    ...(product.brand
      ? { brand: { '@type': 'Brand', name: product.brand } }
      : {}),
    offers: {
      '@type': 'Offer',
      url: pageUrl,
      priceCurrency: 'OMR',
      price: (currentPrice(product) / 1000).toFixed(3),
      availability:
        product.stock > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Escaped so product text can never close the script tag.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
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
                <ProductImage product={product} size={720} priority />
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
              <Stock stock={product.stock} className="mt-2" />
              <p className="mt-3 text-sm text-fg-muted">
                No online checkout yet. Add to your cart to plan, then ask us on
                WhatsApp to order.
              </p>
            </div>

            <div className="mt-6">
              <ProductActions product={product} pageUrl={pageUrl} />
            </div>

            <p className="mt-8 leading-7 text-fg-muted">{product.summary}</p>

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
