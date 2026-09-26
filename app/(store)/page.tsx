import { ArrowRight, Cpu, Gauge } from 'lucide-react';
import { attributeRows, partTypeLabel } from '@/lib/catalog';
import { SLOTS } from '@/lib/pc-builder';
import {
  fitDescription,
  organizationLd,
  pageMetadata,
  websiteLd,
} from '@/lib/seo';
import { Eyebrow, Price, ProductImage, Stock } from '@/components/ui/bits';
import { buttonClass } from '@/components/ui/button';
import { JsonLd } from '@/components/ui/json-ld';
import { categoryLook, hueStyle } from '@/components/store/category-look';
import { ProductGrid } from '@/components/store/product-cell';
import { Section } from '@/components/store/section';
import { getHomeData } from '@/server/catalog/public';
import { getSiteUrl } from '@/server/site-url';

export const metadata = pageMetadata({
  title: 'BLACKSHARK: Gaming PCs, PC Parts & Gaming Gear in Oman',
  description: fitDescription([
    'Shop gaming PCs, graphics cards, processors, monitors and gaming gear in Oman with clear OMR prices and live stock.',
    'Build a PC that fits, then order on WhatsApp.',
  ]),
  path: '/',
});

export default async function HomePage() {
  const [{ featured, newest, deals, categories, brands }, siteUrl] =
    await Promise.all([getHomeData(), getSiteUrl()]);
  const productCount = categories.reduce(
    (sum, category) => sum + category.productCount,
    0,
  );
  // The hero card shows a real featured product that has a photo.
  const hero =
    [...featured, ...newest].find((product) => product.image) ?? null;

  return (
    <>
      <JsonLd data={[organizationLd(siteUrl), websiteLd(siteUrl)]} />
      <section
        aria-labelledby="hero-title"
        className="relative overflow-hidden border-b border-line"
      >
        <div aria-hidden="true" className="blueprint absolute inset-0" />
        {/* Phones: a colour glow instead of the wide-screen product layout. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_85%_8%,rgb(61_224_255/0.22),transparent),radial-gradient(55%_40%_at_0%_38%,rgb(155_123_255/0.2),transparent)] md:hidden"
        />
        <div className="relative mx-auto grid max-w-[1400px] grid-cols-1 gap-10 px-4 py-10 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
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
            <div className="mt-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <a
                href="/build"
                className={buttonClass('primary', 'lg', 'justify-center')}
              >
                <Cpu aria-hidden="true" className="size-5" /> Build a PC
              </a>
              <a
                href="/categories/pc-components"
                className={buttonClass('secondary', 'lg', 'justify-center')}
              >
                <span className="sm:hidden">Components</span>
                <span className="max-sm:hidden">Shop components</span>
              </a>
            </div>
            <nav
              aria-label="Shop by category"
              className="-mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
            >
              {categories.map((category) => {
                const Icon = categoryLook(category.slug).icon;
                return (
                  <a
                    key={category.slug}
                    href={`/categories/${category.slug}`}
                    style={hueStyle(category.slug)}
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--hue)_35%,var(--color-line-strong))] bg-ink-900/80 px-4 text-sm font-medium"
                  >
                    <Icon
                      aria-hidden="true"
                      className="size-4 text-[var(--hue)]"
                    />
                    {category.name}
                  </a>
                );
              })}
            </nav>
          </div>

          {hero ? (
            // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- named by the product text inside
            <a
              href={`/products/${hero.slug}`}
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
                  <p className="mt-1 text-lg font-semibold leading-snug group-hover:text-accent">
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
                        <Stock
                          stock={hero.stock}
                          onRequest={hero.stockOnRequest}
                        />
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

      <div className="border-b border-line bg-ink-900 max-sm:hidden">
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
        {/* Phones: colour tiles. Wider screens: the ruled list. */}
        <ul className="grid grid-cols-2 gap-3 md:hidden">
          {categories.map((category) => {
            const Icon = categoryLook(category.slug).icon;
            return (
              <li key={category.slug}>
                <a
                  href={`/categories/${category.slug}`}
                  style={hueStyle(category.slug)}
                  className="flex h-full min-h-32 flex-col rounded-xl border border-[color-mix(in_srgb,var(--hue)_30%,var(--color-line))] bg-[radial-gradient(130%_100%_at_0%_0%,color-mix(in_srgb,var(--hue)_20%,transparent),transparent_65%)] p-4 active:scale-[0.98]"
                >
                  <span className="grid size-10 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--hue)_18%,transparent)] text-[var(--hue)]">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="mt-auto pt-4 font-semibold leading-tight">
                    {category.name}
                  </span>
                  <span className="mt-1 font-mono text-xs text-fg-subtle">
                    {category.productCount
                      ? `${category.productCount} products`
                      : 'Coming soon'}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
        <div className="max-md:hidden">
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
        </div>
      </Section>

      <Section
        index="02"
        eyebrow="PC builder"
        title="Eight parts. Checked as you go."
        href="/build"
        linkLabel="Start a build"
      >
        {/* Phones: one card instead of eight small cells. */}
        <a
          href="/build"
          className="relative block overflow-hidden rounded-xl border border-accent/30 bg-[linear-gradient(140deg,rgb(61_224_255/0.16),transparent_55%),radial-gradient(80%_60%_at_100%_100%,rgb(155_123_255/0.18),transparent)] p-5 md:hidden"
        >
          <span className="grid size-11 place-items-center rounded-lg bg-accent text-accent-ink">
            <Cpu aria-hidden="true" className="size-5" />
          </span>
          <span className="mt-4 block text-lg font-semibold leading-snug">
            Pick parts that fit, step by step
          </span>
          <span className="mt-2 block text-sm leading-6 text-fg-muted">
            Each step only shows parts that work with what you chose. Add fans,
            a monitor or gear, then send the build on WhatsApp.
          </span>
          <span className="mt-4 flex flex-wrap gap-1.5">
            {SLOTS.filter((slot) => !slot.optional).map((slot) => (
              <span
                key={slot.key}
                className="rounded-full border border-line-strong bg-ink-950/60 px-2.5 py-1 text-xs text-fg-muted"
              >
                {slot.label}
              </span>
            ))}
          </span>
          <span className="mt-4 flex items-center gap-2 text-sm text-fg-muted">
            <Gauge aria-hidden="true" className="size-4 text-accent" />
            Estimated FPS in Fortnite, Warzone and Black Ops 7
          </span>
          <span className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-accent px-4 font-semibold text-accent-ink">
            Start a build <ArrowRight aria-hidden="true" className="size-4" />
          </span>
        </a>
        <div className="max-md:hidden">
        <ol className="ruled overflow-hidden rounded-lg grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
          {SLOTS.filter((slot) => !slot.optional).map((slot, i) => (
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
        </div>
      </Section>

      {deals.length ? (
        <Section
          index="03"
          eyebrow="Price drops"
          title="On sale now"
          href="/deals"
        >
          <ProductGrid products={deals} rail />
        </Section>
      ) : null}

      {featured.length ? (
        <Section
          index="04"
          eyebrow="Picked by the store"
          title="Featured"
          href="/search?sort=featured"
        >
          <ProductGrid products={featured} rail />
        </Section>
      ) : null}

      <Section
        index="05"
        eyebrow="Recently added"
        title="New in"
        href="/search?sort=newest"
      >
        <ProductGrid products={newest} rail />
      </Section>

      <Section index="06" eyebrow="Brands" title="Shop by brand">
        <ul className="flex flex-wrap gap-2 md:hidden">
          {brands.map((brand) => (
            <li key={brand.slug}>
              <a
                href={`/search?brand=${brand.slug}`}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong bg-ink-900 px-4 text-sm font-medium"
              >
                {brand.name}
                <span className="font-mono text-xs text-fg-subtle">
                  {brand.productCount}
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className="max-md:hidden">
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
        </div>
      </Section>
    </>
  );
}
