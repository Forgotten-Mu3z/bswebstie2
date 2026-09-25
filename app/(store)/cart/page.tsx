import { breadcrumbLd, fitDescription, pageMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/ui/json-ld';
import { Eyebrow } from '@/components/ui/bits';
import { CartPage } from '@/components/store/cart-page';
import { getSiteUrl } from '@/server/site-url';

export const metadata = pageMetadata({
  title: 'Your Cart: Items Saved on This Device | BLACKSHARK Oman',
  description: fitDescription([
    'Your BLACKSHARK cart, saved on this device.',
    'Prices and stock refresh on every visit.',
    'There is no online checkout yet: send your cart on WhatsApp to order in Oman.',
  ]),
  path: '/cart',
  noindex: true,
});

export default async function Cart() {
  const siteUrl = await getSiteUrl();
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd data={breadcrumbLd(siteUrl, [{ name: 'Cart', path: '/cart' }])} />
      <div className="mb-8">
        <Eyebrow>Your cart</Eyebrow>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Cart
        </h1>
        <p className="mt-3 text-fg-muted">
          Saved on this device. Prices and stock are refreshed each visit.
        </p>
      </div>
      <CartPage siteUrl={siteUrl} />
    </div>
  );
}
