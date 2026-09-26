import { pageMetadata } from '@/lib/seo';
import { LegalPage } from '@/components/legal/legal-page';

export const metadata = pageMetadata({
  title: 'Legal Information and Store Policies | BLACKSHARK Oman',
  description:
    'All BLACKSHARK store policies in one place: terms of use, privacy, returns, refunds and warranty, cookies and browser storage, and how to contact the store.',
  path: '/legal',
});

export default function LegalIndexPage() {
  return (
    <LegalPage
      path="/legal"
      title="Legal information"
      intro={
        <p>
          These policies explain how this website and our WhatsApp orders work.
          Each one shows the date it was last changed.
        </p>
      }
      sections={[]}
    />
  );
}
