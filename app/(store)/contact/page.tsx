import { BUSINESS, businessName } from '@/lib/business';
import { INSTAGRAM_URL, pageMetadata } from '@/lib/seo';
import { ContactOptions } from '@/components/legal/contact-options';
import { LegalPage } from '@/components/legal/legal-page';

export const metadata = pageMetadata({
  title: 'Contact BLACKSHARK: WhatsApp Orders, Returns and Support',
  description:
    'Contact BLACKSHARK in Oman on WhatsApp about orders, PC builds, returns and warranty, privacy requests, content complaints or security problems.',
  path: '/contact',
});

export default function ContactPage() {
  const details = [
    BUSINESS.legalName ? `Business name: ${businessName()}` : null,
    BUSINESS.registrationNumber
      ? `Commercial registration: ${BUSINESS.registrationNumber}`
      : null,
    BUSINESS.address ? `Address: ${BUSINESS.address}` : null,
  ].filter((line): line is string => Boolean(line));

  return (
    <LegalPage
      path="/contact"
      title="Contact us"
      intro={
        <p>
          The quickest way to reach {BUSINESS.tradingName} is WhatsApp. Pick who
          to message below; we answer questions about orders, PC builds, returns
          and anything on this website.
        </p>
      }
      sections={[
        {
          id: 'message-us',
          title: 'Message us',
          body: (
            <>
              <ContactOptions />
              <p>
                Messaging us on WhatsApp shares your WhatsApp name and number
                with us. See the <a href="/privacy">Privacy policy</a> for how
                we use them.
              </p>
            </>
          ),
        },
        {
          id: 'topics',
          title: 'What to contact us about',
          body: (
            <ul>
              <li>
                <strong>Orders, prices and stock</strong>: send the product or
                your PC build and we will confirm the details.
              </li>
              <li>
                <strong>Faults, returns and warranty</strong>: see{' '}
                <a href="/refunds">Returns, refunds and warranty</a> for what to
                include.
              </li>
              <li>
                <strong>Your information</strong>: to see, correct or delete
                what we hold about you (see{' '}
                <a href="/privacy#your-rights">your rights</a>).
              </li>
              <li>
                <strong>Content complaints</strong>: if you believe a photo,
                text or logo on this website is yours and used without
                permission, tell us the page and what the content is. We will
                look into it and remove it where appropriate.
              </li>
              <li>
                <strong>Security problems</strong>: if you find a weakness in
                the website, please tell us privately, and do not test it in a
                way that could harm the site or other people&apos;s data.
              </li>
            </ul>
          ),
        },
        ...(details.length
          ? [
              {
                id: 'business',
                title: 'Business details',
                body: (
                  <ul>
                    {details.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                ),
              },
            ]
          : []),
        {
          id: 'instagram',
          title: 'Instagram',
          body: (
            <p>
              See new arrivals and offers on{' '}
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                our Instagram
              </a>{' '}
              (opens Instagram).
            </p>
          ),
        },
      ]}
    />
  );
}
