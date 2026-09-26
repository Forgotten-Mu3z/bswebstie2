import { BUSINESS } from '@/lib/business';
import { legalDoc } from '@/lib/legal';
import { pageMetadata } from '@/lib/seo';
import {
  ContactOptions,
  contactPhrase,
} from '@/components/legal/contact-options';
import { LegalPage } from '@/components/legal/legal-page';

// The store sells physical products (PCs, parts, gear, monitors, consoles,
// games) agreed on WhatsApp; "Digital Cards" is a category for codes.
// No return period or refund time is invented here: set changeOfMindDays in
// lib/business.ts once the owner decides one.
// TODO_LEGAL_REVIEW: check this policy against Oman's Consumer Protection Law
// and its regulations (faulty goods, warranty, returns).

const doc = legalDoc('/refunds');

export const metadata = pageMetadata({
  title: 'Returns, Refunds and Warranty Policy | BLACKSHARK Oman',
  description:
    'What to do if a BLACKSHARK order is faulty, damaged or not what you ordered, how warranty and change-of-mind returns work, and how refunds are paid.',
  path: doc.path,
});

export default function RefundsPage() {
  const days = BUSINESS.changeOfMindDays;
  return (
    <LegalPage
      path={doc.path}
      title={doc.title}
      updated={doc.updated}
      intro={
        <p>
          This policy covers products you buy from us after ordering on
          WhatsApp. If anything is wrong with your order, contact us{' '}
          {contactPhrase()} as soon as you can and we will help.
        </p>
      }
      sections={[
        {
          id: 'your-rights',
          title: 'Your legal rights come first',
          body: (
            <p>
              Nothing in this policy limits your rights under the consumer
              protection laws of {BUSINESS.country}. Where the law gives you
              more than this policy does, the law applies.
            </p>
          ),
        },
        {
          id: 'faulty',
          title: 'Faulty or damaged items',
          body: (
            <>
              <p>
                If an item does not work properly or arrives damaged, tell us as
                soon as you notice, with your order details and photos or a
                short video of the problem. We will check it and then repair,
                replace or refund it as the law and the product&apos;s warranty
                require.
              </p>
              <p>
                Please keep the item, its accessories and packaging until we
                have agreed what happens next.
              </p>
            </>
          ),
        },
        {
          id: 'wrong-item',
          title: 'Wrong item or not as described',
          body: (
            <p>
              If you receive a different product from the one we confirmed, or
              it does not match its description, contact us and we will exchange
              it or refund you.
            </p>
          ),
        },
        {
          id: 'warranty',
          title: 'Warranty',
          body: (
            <>
              <p>
                The warranty for a product is the one stated on its product page
                or confirmed to you in the chat. Many products also carry the
                manufacturer&apos;s warranty. Keep your invoice or the chat
                confirming your order as proof of purchase.
              </p>
              <p>
                Warranty covers faults, not damage caused by accidents, misuse
                or unauthorised repairs.
              </p>
              {/* TODO_OWNER: confirm the store's standard warranty terms. */}
            </>
          ),
        },
        {
          id: 'change-of-mind',
          title: 'Changing your mind',
          body: days ? (
            <p>
              You can ask to return an unused item in its original, complete
              packaging within {days} days of receiving it, except the items
              listed below. Contact us first; we will tell you how to return it.
            </p>
          ) : (
            <p>
              We do not publish a fixed period for change-of-mind returns.
              Before you pay, ask us whether the item can be returned if you
              change your mind, and we will tell you in the chat.
            </p>
          ),
        },
        {
          id: 'exceptions',
          title: 'Items that may not be returned for a change of mind',
          body: (
            <>
              <p>
                Where the law allows, the following cannot be returned just
                because you changed your mind. They are still covered if they
                are faulty or not as described.
              </p>
              <ul>
                <li>games and software once opened;</li>
                <li>digital cards and codes once delivered;</li>
                <li>PCs built or configured to your specification;</li>
                <li>items damaged after delivery.</li>
              </ul>
              <p>We will tell you before you pay if your order includes one.</p>
              {/* TODO_LEGAL_REVIEW: confirm which exceptions Oman law
                  allows. */}
            </>
          ),
        },
        {
          id: 'digital',
          title: 'Digital cards and codes',
          body: (
            <>
              <p>
                A digital card or code counts as delivered when we send it to
                you in the chat or hand it to you. If a code does not work, tell
                us straight away without trying to change it: we will check it
                with the issuer and replace or refund it if it was faulty.
              </p>
              {/* TODO_LEGAL_REVIEW: confirm the delivery and refund wording
                  for digital codes. */}
            </>
          ),
        },
        {
          id: 'custom-builds',
          title: 'Custom PC builds',
          body: (
            <p>
              A PC we assemble to your order is made from parts that each keep
              their own warranty. If the PC or a part is faulty, the sections
              above apply. If you change your mind after assembly has started,
              contact us and we will explain what we can do.
            </p>
          ),
        },
        {
          id: 'payment-problems',
          title: 'Duplicate or wrong payments',
          body: (
            <p>
              If you were charged twice or paid more than the confirmed total,
              tell us: once we confirm it, we refund the extra amount. If a
              payment was made that you did not make, contact us and your bank
              straight away.
            </p>
          ),
        },
        {
          id: 'how-to-ask',
          title: 'How to ask for a return or refund',
          body: (
            <ol>
              <li>
                Message us {contactPhrase()} with the product, when you got it
                and what is wrong, plus photos if it is damaged or faulty.
              </li>
              <li>
                We reply with the next steps. Please do not send items back
                before we agree how.
              </li>
              <li>
                Once the return is agreed and checked, we repair, replace or
                refund as described above.
              </li>
            </ol>
          ),
        },
        {
          id: 'refund-payment',
          title: 'How refunds are paid',
          body: (
            <p>
              Refunds go back the way you paid where possible, or another way we
              agree with you.{' '}
              {BUSINESS.refundTime
                ? `Once we accept a return, we pay the refund within ${BUSINESS.refundTime}.`
                : 'We tell you in the chat when to expect it.'}{' '}
              If you paid by card or bank transfer, your bank may take longer to
              show it.
            </p>
          ),
        },
        {
          id: 'disputes',
          title: 'Card disputes',
          body: (
            <p>
              If you paid by card and raise a dispute with your bank, please
              tell us too, so we can resolve it with you directly.
            </p>
          ),
        },
        {
          id: 'contact',
          title: 'Contact',
          body: <ContactOptions />,
        },
      ]}
    />
  );
}
