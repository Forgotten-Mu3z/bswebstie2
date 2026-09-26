import { legalDoc } from '@/lib/legal';
import { pageMetadata } from '@/lib/seo';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import { ClearDeviceData } from '@/components/legal/clear-device-data';
import { ContactOptions } from '@/components/legal/contact-options';
import { LegalPage } from '@/components/legal/legal-page';

// Every cookie and storage key the site uses (checked in the code: the
// admin session cookie in server/security/sessions.ts, and lib/storage-keys).
// There are no optional cookies or trackers, so there is no consent banner;
// if any are ever added, they must not load before the visitor agrees.

const doc = legalDoc('/cookies');

export const metadata = pageMetadata({
  title: 'Cookies and Browser Storage on BLACKSHARK | Gaming Oman',
  description:
    'BLACKSHARK sets no cookies for shoppers and uses no trackers. See what the store keeps in your browser for saved items and PC builds, and clear it here.',
  path: doc.path,
});

const cell = 'border-t border-line px-3 py-2.5 align-top';

export default function CookiesPage() {
  return (
    <LegalPage
      path={doc.path}
      title={doc.title}
      updated={doc.updated}
      intro={
        <p>
          The store sets <strong>no cookies</strong> for shoppers and loads no
          advertising or analytics trackers. It keeps two small items in your
          browser&apos;s local storage, for features you use yourself. Nothing
          is optional or used for tracking, so there is no cookie banner.
        </p>
      }
      sections={[
        {
          id: 'store',
          title: 'What the store keeps in your browser',
          body: (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse rounded-lg border border-line text-left text-sm">
                <caption className="sr-only">
                  Items the store keeps in local storage
                </caption>
                <thead className="bg-ink-900 font-mono text-[11px] uppercase tracking-[0.12em] text-fg-subtle">
                  <tr>
                    <th scope="col" className="px-3 py-2.5 font-normal">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-normal">
                      Purpose
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-normal">
                      Kept until
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th
                      scope="row"
                      className={`${cell} break-all font-mono text-xs font-normal`}
                    >
                      {STORAGE_KEYS.saved}
                    </th>
                    <td className={cell}>
                      Items you saved with the heart button (product details and
                      prices, so the list shows straight away).
                    </td>
                    <td className={cell}>You clear it</td>
                  </tr>
                  <tr>
                    <th
                      scope="row"
                      className={`${cell} break-all font-mono text-xs font-normal`}
                    >
                      {STORAGE_KEYS.build}
                    </th>
                    <td className={cell}>
                      The PC build you are working on in the PC builder.
                    </td>
                    <td className={cell}>You clear it or start over</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ),
        },
        {
          id: 'staff',
          title: 'Admin panel cookie (staff only)',
          body: (
            <p>
              The separate admin site used by store staff sets one strictly
              necessary cookie, <code>__Host-bsg_admin</code>, that keeps a
              staff member signed in. It is HttpOnly, Secure and
              SameSite=Strict, only works on the admin site, and lasts 10
              minutes during sign-in and up to 12 hours after it. Shoppers never
              receive it.
            </p>
          ),
        },
        {
          id: 'others',
          title: 'Other companies',
          body: (
            <p>
              Our pages load nothing from other companies: fonts, images and
              scripts all come from our own site, so no one else can set cookies
              through them. When you open WhatsApp or Instagram from our links,
              those services use their own cookies under their own policies.
            </p>
          ),
        },
        {
          id: 'your-choices',
          title: 'Your choices',
          body: (
            <>
              <p>
                Clear everything the store keeps in this browser (your saved
                items and PC build will be removed):
              </p>
              <ClearDeviceData />
              <p>
                You can also clear site data in your browser&apos;s settings. If
                we ever add optional cookies, such as analytics, we will ask for
                your permission first and let you change your mind at any time.
              </p>
            </>
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
