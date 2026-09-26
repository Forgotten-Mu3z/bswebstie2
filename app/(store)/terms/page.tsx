import { BUSINESS, businessName } from '@/lib/business';
import { legalDoc } from '@/lib/legal';
import { pageMetadata } from '@/lib/seo';
import {
  ContactOptions,
  contactPhrase,
} from '@/components/legal/contact-options';
import { LegalPage } from '@/components/legal/legal-page';

// Matches how the store works: a catalog website, no accounts, no online
// payment; every order is agreed and confirmed on WhatsApp.
// TODO_LEGAL_REVIEW: have these terms reviewed by qualified Oman counsel,
// in particular liability, consumer rights and governing law.

const doc = legalDoc('/terms');

export const metadata = pageMetadata({
  title: 'Terms of Use for Shopping at BLACKSHARK Gaming, Oman',
  description:
    'The terms for using the BLACKSHARK website and ordering on WhatsApp: prices in OMR, how orders are confirmed, PC builder and FPS estimates, and your rights.',
  path: doc.path,
});

export default function TermsPage() {
  return (
    <LegalPage
      path={doc.path}
      title={doc.title}
      updated={doc.updated}
      intro={
        <p>
          These terms apply when you use this website or order from{' '}
          {businessName()} (&quot;we&quot;, &quot;us&quot;). Please read them
          with our <a href="/refunds">Returns, refunds and warranty</a> policy
          and our <a href="/privacy">Privacy policy</a>.
        </p>
      }
      sections={[
        {
          id: 'about',
          title: 'About these terms',
          body: (
            <p>
              By using the website or placing an order with us, you agree to
              these terms. They do not take away any rights you have under the
              consumer protection laws of {BUSINESS.country} or any other law
              that cannot be changed by agreement.
            </p>
          ),
        },
        {
          id: 'website',
          title: 'What the website is',
          body: (
            <p>
              The website is a catalog of the gaming PCs, parts and gear we
              sell, with prices in Omani rials (OMR), a PC builder and a way to
              contact us. It has no customer accounts and does not take
              payments. Orders are made with us directly on WhatsApp.
            </p>
          ),
        },
        {
          id: 'products',
          title: 'Product information',
          body: (
            <>
              <p>
                We take care to describe products correctly. Specifications come
                from manufacturers and may change. Photos show the product or
                its type and may differ slightly from the item you receive, for
                example in packaging or colour. Some products were listed from
                our Instagram posts; the product page says so.
              </p>
              <p>
                If something on the website looks wrong, ask us before you buy:
                we will confirm the details in the chat.
              </p>
            </>
          ),
        },
        {
          id: 'prices-stock',
          title: 'Prices and stock',
          body: (
            <>
              <p>
                Prices are shown in OMR. Stock counts are updated by our staff;
                some products show no count and are confirmed in the chat.
                Prices and stock can change, so the price and availability that
                apply to your order are the ones we confirm to you on WhatsApp
                before you pay.
              </p>
              <p>
                If a price on the website is clearly a mistake, we will tell you
                before you pay and you can decide whether to continue.
              </p>
              {/* TODO_OWNER: say whether prices include VAT, once confirmed
                  with an accountant. */}
            </>
          ),
        },
        {
          id: 'orders',
          title: 'How orders work',
          body: (
            <ol>
              <li>
                You tap &quot;Order on WhatsApp&quot; (or send a PC build) and
                send us the message that WhatsApp opens with.
              </li>
              <li>
                We reply to confirm the product, quantity, total price and
                availability, and how you will pay and receive the order.
              </li>
              <li>
                Your order is accepted when we confirm it in the chat. The price
                written in the pre-filled message is for reference; the
                confirmed price is the one we agree with you.
              </li>
            </ol>
          ),
        },
        {
          id: 'payment-delivery',
          title: 'Payment, delivery and collection',
          body: (
            <>
              <p>
                {BUSINESS.paymentMethods
                  ? `You can pay by: ${BUSINESS.paymentMethods.join(', ')}. `
                  : ''}
                How you pay, and whether we deliver the order or you collect it,
                is agreed in the chat before you pay.
                {BUSINESS.delivery ? ` ${BUSINESS.delivery}` : ''}
              </p>
              {/* TODO_OWNER: add accepted payment methods and delivery or
                  collection details in lib/business.ts. */}
            </>
          ),
        },
        {
          id: 'returns',
          title: 'Returns, refunds and warranty',
          body: (
            <p>
              See <a href="/refunds">Returns, refunds and warranty</a>. It
              explains what to do if an item is faulty, damaged or not what you
              ordered.
            </p>
          ),
        },
        {
          id: 'builder',
          title: 'The PC builder',
          body: (
            <p>
              The PC builder checks the main compatibility rules (processor
              socket, memory type, board size and power) using the
              specifications in our catalog. It is a guide, not a guarantee:
              send us your build and ask us to confirm that the parts work
              together before you buy.
            </p>
          ),
        },
        {
          id: 'fps',
          title: 'Estimated FPS',
          body: (
            <p>
              Estimated frames per second (FPS) shown for games are rough ranges
              based on typical results for similar hardware. They are not
              measurements of the PC you buy and not a promise of performance.
              Real results depend on game updates, settings, drivers and the
              rest of the system.
            </p>
          ),
        },
        {
          id: 'use',
          title: 'Using the website fairly',
          body: (
            <>
              <p>Please do not:</p>
              <ul>
                <li>
                  try to break into, overload or disrupt the website or the
                  admin panel;
                </li>
                <li>
                  copy the catalog in bulk with automated tools in a way that
                  harms the service;
                </li>
                <li>
                  use the website or our WhatsApp contacts for fraud, spam or
                  anything unlawful.
                </li>
              </ul>
              <p>
                We may block access that puts the website or our customers at
                risk.
              </p>
            </>
          ),
        },
        {
          id: 'ip',
          title: 'Names, logos and content',
          body: (
            <p>
              The BLACKSHARK name, logo and the website&apos;s own text and
              design belong to us. Product names, brand names and logos belong
              to their owners and are used only to identify the products we
              sell; this does not mean those companies endorse us.
            </p>
          ),
        },
        {
          id: 'third-parties',
          title: 'WhatsApp, Instagram and other services',
          body: (
            <p>
              Ordering uses WhatsApp, and the website links to Instagram. Those
              services are run by other companies under their own terms. We are
              not responsible for how they work or for their availability.
            </p>
          ),
        },
        {
          id: 'availability',
          title: 'Availability of the website',
          body: (
            <p>
              We try to keep the website available and correct, but it may
              sometimes be unavailable, for example during maintenance or
              because of problems with our hosting provider. You can always
              reach us on WhatsApp.
            </p>
          ),
        },
        {
          id: 'liability',
          title: 'Our responsibility to you',
          body: (
            <>
              <p>
                We are responsible for supplying products as agreed and as the
                law requires. We are not responsible for losses that were not
                foreseeable, or that are caused by events outside our reasonable
                control. Nothing in these terms limits our responsibility where
                the law does not allow it to be limited.
              </p>
              {/* TODO_LEGAL_REVIEW: confirm this wording is appropriate and
                  enforceable under Oman law. */}
            </>
          ),
        },
        {
          id: 'changes',
          title: 'Changes to these terms',
          body: (
            <p>
              We may update these terms when the store or the law changes. The
              date and version at the top show the current version. The terms
              that apply to your order are the ones in force when we confirm it.
            </p>
          ),
        },
        ...(BUSINESS.governingLaw
          ? [
              {
                id: 'law',
                title: 'Law and disputes',
                body: <p>{BUSINESS.governingLaw}</p>,
              },
            ]
          : []),
        {
          id: 'contact',
          title: 'Questions and complaints',
          body: (
            <>
              <p>
                If something goes wrong, contact us first {contactPhrase()} and
                we will try to put it right.
              </p>
              <ContactOptions />
            </>
          ),
        },
      ]}
    />
  );
}
