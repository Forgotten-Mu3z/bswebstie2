import { Eyebrow } from '@/components/ui/bits';
import { CartPage } from '@/components/store/cart-page';
import { getSiteUrl } from '@/server/site-url';

export const metadata = {
  title: 'Cart',
  robots: { index: false, follow: false },
};

export default async function Cart() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <Eyebrow>Your cart</Eyebrow>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Cart
        </h1>
        <p className="mt-3 text-fg-muted">
          Saved on this device. Prices and stock are refreshed each visit.
        </p>
      </div>
      <CartPage siteUrl={await getSiteUrl()} />
    </div>
  );
}
