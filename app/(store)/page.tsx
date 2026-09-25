import { ArrowRight, Cpu } from 'lucide-react';
import { attributeRows, partTypeLabel } from '@/lib/catalog';
import { SLOTS } from '@/lib/pc-builder';
import { Eyebrow, Price, ProductImage, Stock } from '@/components/ui/bits';
import { buttonClass } from '@/components/ui/button';
import { ProductGrid } from '@/components/store/product-cell';
import { Section } from '@/components/store/section';
import { getHomeData } from '@/server/catalog/public';

export const metadata = { alternates: { canonical: '/' } };

export default async function HomePage() {
  const { featured, newest, deals, categories, brands } = await getHomeData();
  const productCount = categories.reduce(
    (sum, category) => sum + category.productCount,
    0,
  );
  // The hero card shows a real featured product that has a photo.
  const hero =
    [...featured, ...newest].find((product) => product.image) ?? null;

  return (
    <>
      <section
        aria-labelledby="hero-title"
        className="relative overflow-hidden border-b border-line"
      >
        <div aria-hidden="true" className="blueprint absolute inset-0" />
        <div className="relative mx-auto grid max-w-[1400px] gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            <Eyebrow>BLACKSHARK · Gaming Oman</Eyebrow>
            <h1
              id="hero-title"
              className="mt-4 max-w-2xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
            >
              Build your
              <br />
              next rig<span className="text-accent">.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-fg-muted sm:text-lg">
              Gaming PCs, parts and gear with clear OMR prices and live stock.
              Pick parts step by step; the builder checks they fit.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/build" className={buttonClass('primary', 'lg')}>
                <Cpu aria-hidden="true" className="size-5" /> Build a PC
              </a>
              <a
                href="/categories/pc-components"
                className={buttonClass('secondary', 'lg')}
              >
                Shop components
              </a>
            </div>
          </div>

          {hero ? (
            <a
              href={`/products/${hero.slug}`}
              aria-labelledby="hero-product"
              className="group block overflow-hidden rounded-lg border border-line-strong bg-ink-900/90 shadow-2xl shadow-black/50 transition-colors hover:border-accent/50"
            >
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <Eyebrow>Spec sheet · {hero.sku}</Eyebrow>
                <span
                  className="size-2 rounded-full bg-accent"
                  aria-hidden="true"
                />
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-[180px_1fr] sm:p-5">
                <div className="aspect-square rounded-md bg-ink-850 p-4">
                  <ProductImage
                    product={hero}
                    size={220}
                    priority
                    decorative
                    className="transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg-subtle">
                    {[hero.brand, partTypeLabel(hero.partType) ?? hero.category]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <p
                    id="hero-product"
                    className="mt-1 text-lg font-semibold leading-snug group-hover:text-accent"
                  >
                    {hero.name}
                  </p>
                  <dl className="mt-3 divide-y divide-line border-y border-line font-mono text-xs">
                    {attributeRows(hero.attributes)
                      .slice(0, 3)
                      .map((row) => (
                        <div
                          key={row.label}
                          className="flex justify-between gap-3 py-1.5"
                        >
                          <dt className="text-fg-subtle">{row.label}</dt>
                          <dd>{row.value}</dd>
                        </div>
                      ))}
                    <div className="flex justify-between gap-3 py-1.5">
                      <dt className="text-fg-subtle">Availability</dt>
                      <dd>
                        <Stock stock={hero.stock} />
                      </dd>
                    </div>
                  </dl>
                  <Price
                    priceBaisa={hero.priceBaisa}
                    salePriceBaisa={hero.salePriceBaisa}
                    size="lg"
                    className="mt-4"
                  />
                </div>
              </div>
            </a>
          ) : null}
        </div>
      </section>

      <div className="border-b border-line bg-ink-900">
        <dl className="mx-auto grid max-w-[1400px] grid-cols-2 divide-line sm:grid-cols-4 sm:divide-x">
          {[
            [String(productCount), 'products listed'],
            [String(brands.length), 'brands'],
            ['8', 'step PC builder'],
            ['OMR', 'prices, stock shown live'],
          ].map(([value, label]) => (
            <div key={label} className="px-4 py-5 sm:px-6">
              <dt className="sr-only">{label}</dt>
              <dd>
                <span className="block font-mono text-2xl font-semibold tabular">
                  {value}
                </span>
                <span className="mt-1 block text-sm text-fg-muted">
                  {label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <Section index="01" eyebrow="Departments" title="Shop by category">
        <ul className="ruled overflow-hidden rounded-lg sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category, i) => (
            <li key={category.slug}>
              <a
                href={`/categories/${category.slug}`}
                className="group flex h-full items-start gap-4 p-5 transition-colors hover:bg-ink-850"
              >
                <span className="font-mono text-sm text-fg-subtle">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold group-hover:text-accent">
                    {category.name}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-fg-muted">
                    {category.description}
                  </span>
                  <span className="mt-3 block font-mono text-xs text-fg-subtle">
                    {category.productCount
                      ? `${category.productCount} products`
                      : 'Coming soon'}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="mt-1 size-4 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                />
              </a>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        index="02"
        eyebrow="PC builder"
        title="Eight parts. Checked as you go."
        href="/build"
        linkLabel="Start a build"
      >
        <ol className="ruled overflow-hidden rounded-lg grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
          {SLOTS.map((slot, i) => (
            <li key={slot.key} className="p-4">
              <span className="font-mono text-xs text-accent">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="mt-2 block text-sm font-medium">
                {slot.label}
              </span>
              <span className="mt-1 block text-xs leading-5 text-fg-subtle">
                {slot.hint}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      {deals.length ? (
        <Section
          index="03"
          eyebrow="Price drops"
          title="On sale now"
          href="/deals"
        >
          <ProductGrid products={deals} />
        </Section>
      ) : null}

      {featured.length ? (
        <Section
          index="04"
          eyebrow="Picked by the store"
          title="Featured"
          href="/search?sort=featured"
        >
          <ProductGrid products={featured} />
        </Section>
      ) : null}

      <Section
        index="05"
        eyebrow="Recently added"
        title="New in"
        href="/search?sort=newest"
      >
        <ProductGrid products={newest} />
      </Section>

      <Section index="06" eyebrow="Brands" title="Shop by brand">
        <ul className="ruled overflow-hidden rounded-lg grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
          {brands.map((brand) => (
            <li key={brand.slug}>
              <a
                href={`/search?brand=${brand.slug}`}
                className="flex h-full min-h-16 items-center justify-between gap-2 px-4 py-3 hover:bg-ink-850"
              >
                <span className="truncate text-sm font-medium">
                  {brand.name}
                </span>
                <span className="font-mono text-xs text-fg-subtle">
                  {brand.productCount}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
