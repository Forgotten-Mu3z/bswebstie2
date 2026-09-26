import { BUSINESS, businessName } from '@/lib/business';
import { WHATSAPP_CONTACTS } from '@/lib/contacts';
import { legalDoc } from '@/lib/legal';
import { pageMetadata } from '@/lib/seo';
import {
  ContactOptions,
  contactPhrase,
} from '@/components/legal/contact-options';
import { LegalPage } from '@/components/legal/legal-page';

// Written from what the code does (see docs/privacy-data-inventory.md). If
// the website starts collecting anything new, update both.
// TODO_LEGAL_REVIEW: have this policy reviewed against Oman's Personal Data
// Protection Law (and any other law for customers outside Oman).

const doc = legalDoc('/privacy');

export const metadata = pageMetadata({
  title: 'Privacy Policy: What BLACKSHARK Collects and Why | Oman',
  description:
    'How BLACKSHARK handles information on its website and in WhatsApp orders: no shopper accounts or trackers, and what Cloudflare, WhatsApp and Supabase receive.',
  path: doc.path,
});

const staffNames = WHATSAPP_CONTACTS.map((contact) => contact.name).join(
  ' and ',
);

export default function PrivacyPage() {
  return (
    <LegalPage
      path={doc.path}
      title={doc.title}
      updated={doc.updated}
      intro={
        <>
          <p>
            This policy explains what information {businessName()} handles when
            you use this website or order from us on WhatsApp, why, and who else
            receives it. It describes how the website works today.
          </p>
          <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
            <p>
              <strong>In short</strong>
            </p>
            <ul>
              <li>
                There are no customer accounts, no online payments and no
                advertising or analytics trackers on this website.
              </li>
              <li>
                The website sets no cookies for shoppers. Saved items and PC
                builds stay in your own browser.
              </li>
              <li>
                Orders happen on WhatsApp. When you message us, we receive your
                WhatsApp details and what you write.
              </li>
            </ul>
          </div>
        </>
      }
      sections={[
        {
          id: 'who-we-are',
          title: 'Who we are',
          body: (
            <>
              <p>
                The website and store are run by {businessName()}, based in{' '}
                {BUSINESS.country}.
                {BUSINESS.registrationNumber
                  ? ` Commercial registration number: ${BUSINESS.registrationNumber}.`
                  : ''}
                {BUSINESS.address ? ` Address: ${BUSINESS.address}.` : ''} You
                can reach us {contactPhrase()} (see{' '}
                <a href="#contact">Contact</a>
                ).
              </p>
            </>
          ),
        },
        {
          id: 'browsing',
          title: 'When you browse the website',
          body: (
            <>
              <p>
                The website is hosted on Cloudflare. To deliver pages and
                protect the site, every request passes through Cloudflare, which
                processes your <strong>IP address</strong>, browser details (the
                &quot;user agent&quot;), the page you asked for and the time.
              </p>
              <p>
                We use your IP address to limit how many requests one address
                can make in a minute, which stops abuse and password guessing.
                We do not use it to identify you, and we do not build a profile
                of your visits. Apart from the staff sign-in records described
                below, the website does not save these details in its own
                database. Cloudflare may keep limited technical logs under its
                own policies.
              </p>
              {/* TODO_OWNER: confirm in the Cloudflare dashboard whether
                  Workers Logs or Logpush are turned on, and for how long logs
                  are kept, then update this paragraph if needed. */}
            </>
          ),
        },
        {
          id: 'search-and-saved',
          title: 'Search, saved items and PC builds',
          body: (
            <>
              <p>
                What you type in the search box is sent to our server to find
                matching products. It is not stored.
              </p>
              <p>
                Items you save (the heart button) and the PC build you are
                working on are kept in your browser&apos;s local storage, on
                your device, not on our servers. To show current prices and
                stock, the website sends the product numbers of your saved items
                to our server; nothing links that request to you. A PC build is
                also written into the page address, so you can share it: anyone
                with that link sees the parts you picked and nothing else.
              </p>
              <p>
                You can clear this at any time: see{' '}
                <a href="/cookies">Cookies and storage</a>.
              </p>
            </>
          ),
        },
        {
          id: 'whatsapp',
          title: 'Ordering and chatting on WhatsApp',
          body: (
            <>
              <p>
                &quot;Order on WhatsApp&quot; opens WhatsApp with a message we
                write for you: the product name, quantity, SKU, the price shown
                on the website and a link. Nothing is sent to us until you press
                send in WhatsApp, and you can change the message first.
              </p>
              <p>
                When you message us, we receive what WhatsApp shows to anyone
                you chat with: your WhatsApp name, your phone number, your
                profile photo (depending on your WhatsApp settings) and your
                messages. We also receive anything you choose to send, such as a
                delivery address or photos of a faulty item.
              </p>
              <p>
                We use this to answer you, confirm prices and stock, arrange
                payment and delivery or collection, and help with returns and
                warranty. The chats are handled by {staffNames}.
              </p>
              <p>
                WhatsApp is a service of Meta. How WhatsApp itself handles your
                account and messages is covered by the{' '}
                <a
                  href="https://www.whatsapp.com/legal/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp Privacy Policy
                </a>
                .
              </p>
            </>
          ),
        },
        {
          id: 'payments',
          title: 'Payments',
          body: (
            <>
              <p>
                The website does not take payments and never asks for card
                details. How you pay is agreed with us in the WhatsApp chat
                {BUSINESS.paymentMethods
                  ? ` (${BUSINESS.paymentMethods.join(', ')})`
                  : ''}
                . If you pay through a bank or payment provider, they handle
                your payment details under their own terms; we receive the
                confirmation and the amount paid.
              </p>
            </>
          ),
        },
        {
          id: 'staff-accounts',
          title: 'Store staff accounts',
          body: (
            <>
              <p>
                This part only concerns the people who manage the store, not
                shoppers. The admin panel is a separate website. For each staff
                account we hold the email address, a display name and a role.
              </p>
              <ul>
                <li>
                  Passwords and the authenticator app used for two-factor
                  sign-in are handled by Supabase, our sign-in provider, which
                  stores them in its data centre in Japan and sends &quot;forgot
                  password&quot; emails.
                </li>
                <li>
                  Signing in sets one cookie that keeps the person signed in
                  (see <a href="/cookies">Cookies and storage</a>).
                </li>
                <li>
                  Failed sign-in attempts are recorded with the IP address so
                  that repeated guessing can be blocked. These records are
                  deleted automatically, normally within a day or two.
                </li>
                <li>
                  Changes to products and photos, and account events such as
                  sign-ins and password changes, are written to an activity log
                  with the staff member and IP address, so every change can be
                  traced.
                </li>
              </ul>
              {/* TODO_OWNER: decide how long the staff activity log is kept
                  (it currently has no automatic deletion). */}
            </>
          ),
        },
        {
          id: 'links',
          title: 'Instagram and other links',
          body: (
            <p>
              The website links to our Instagram account and to the Instagram
              posts some products came from. Opening those links takes you to
              Instagram, a Meta service, whose own policies apply. The website
              does not embed Instagram posts or buttons, so nothing is sent to
              Instagram just by viewing our pages.
            </p>
          ),
        },
        {
          id: 'not-done',
          title: 'What the website does not do',
          body: (
            <ul>
              <li>It has no customer accounts and asks for no card details.</li>
              <li>
                It has no advertising, analytics, tracking pixels or social
                media widgets.
              </li>
              <li>
                It does not track your location or fingerprint your browser.
              </li>
              <li>
                Fonts and images come from our own site, so your browser does
                not contact other companies while you browse.
              </li>
              {/* TODO_OWNER: confirm the business never sells personal
                  information before keeping the next line. */}
              <li>We do not sell personal information.</li>
            </ul>
          ),
        },
        {
          id: 'why',
          title: 'Why we use information',
          body: (
            <>
              <ul>
                <li>To run the website and keep it secure.</li>
                <li>
                  To answer your messages and to confirm, supply and deliver
                  your order.
                </li>
                <li>To handle returns, refunds and warranty claims.</li>
                <li>
                  To keep business and tax records where the law requires it.
                </li>
                <li>To prevent fraud and misuse.</li>
              </ul>
              {/* TODO_LEGAL_REVIEW: state the legal basis for each purpose in
                  the terms Oman's Personal Data Protection Law uses. */}
            </>
          ),
        },
        {
          id: 'sharing',
          title: 'Who receives information',
          body: (
            <>
              <ul>
                <li>
                  <strong>Cloudflare</strong>: hosting, security and request
                  limits for the website (worldwide network).
                </li>
                <li>
                  <strong>WhatsApp (Meta)</strong>: when you choose to message
                  us.
                </li>
                <li>
                  <strong>Supabase</strong>: sign-in for store staff only.
                </li>
                <li>
                  Others only when needed for your order, such as a courier you
                  agree to, and only the details they need.
                </li>
                <li>Authorities, when the law requires us to.</li>
              </ul>
            </>
          ),
        },
        {
          id: 'outside-oman',
          title: 'Information outside Oman',
          body: (
            <>
              <p>
                Some of these services work outside {BUSINESS.country}:
                Cloudflare&apos;s network is worldwide, Supabase keeps staff
                sign-in data in Japan, and WhatsApp handles messages on
                Meta&apos;s servers.
              </p>
              {/* TODO_LEGAL_REVIEW: check the cross-border transfer rules of
                  Oman's Personal Data Protection Law for these services. */}
            </>
          ),
        },
        {
          id: 'retention',
          title: 'How long information is kept',
          body: (
            <>
              <ul>
                <li>
                  Website: there is no shopper database. Saved items and builds
                  stay in your browser until you clear them.
                </li>
                <li>
                  WhatsApp chats and order records: only as long as we need them
                  for your order, after-sales support and warranty, and our
                  legal and accounting duties.
                </li>
                <li>Staff accounts: as described above.</li>
              </ul>
              {/* TODO_OWNER: add concrete periods once confirmed with an
                  accountant (for example, how long invoices must be kept). */}
            </>
          ),
        },
        {
          id: 'your-rights',
          title: 'Your choices and rights',
          body: (
            <>
              <p>You can ask us to:</p>
              <ul>
                <li>tell you what information we hold about you;</li>
                <li>correct it;</li>
                <li>
                  delete it. Some order and payment records may have to be kept
                  for legal or accounting reasons; we will tell you if so.
                </li>
              </ul>
              <p>
                Contact us {contactPhrase()}. To protect you, we may check that
                the request comes from you, for example by replying to the
                WhatsApp number you ordered from. You can also clear what the
                website stored in your browser yourself, and delete a chat on
                your side of WhatsApp. Depending on where you live, the law may
                give you further rights.
              </p>
            </>
          ),
        },
        {
          id: 'children',
          title: 'Children',
          body: (
            <>
              <p>
                The website does not ask for anyone&apos;s age and has no
                accounts, and we do not knowingly collect personal information
                from children through it. If you are a parent or guardian and
                think your child has sent us personal information, contact us
                and we will delete it.
              </p>
              {/* TODO_LEGAL_REVIEW: decide the minimum age for ordering,
                  parental consent and payment rules for Oman. */}
            </>
          ),
        },
        {
          id: 'security',
          title: 'Security',
          body: (
            <p>
              The website uses HTTPS only. The admin panel is a separate site
              with its own address, every staff sign-in needs a password and a
              code from an authenticator app, and every page and request is
              rate-limited. No system is perfectly secure; if you notice a
              problem, please tell us straight away.
            </p>
          ),
        },
        {
          id: 'changes',
          title: 'Changes to this policy',
          body: (
            <p>
              When the website or the way we handle information changes, we
              update this page and the date and version at the top.
            </p>
          ),
        },
        {
          id: 'contact',
          title: 'Contact',
          body: (
            <>
              <p>Questions or requests about your information:</p>
              <ContactOptions />
            </>
          ),
        },
      ]}
    />
  );
}
