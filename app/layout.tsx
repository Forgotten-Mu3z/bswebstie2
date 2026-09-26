import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { StoreShell } from '@/components/store/store-shell';
import { isAdminSite } from '@/server/security/site';
import { getSiteUrl } from '@/server/site-url';
import './globals.css';

const geist = Geist({ variable: '--font-geist', subsets: ['latin'] });
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  // Pages set their own title, description, canonical and social tags
  // (lib/seo.ts); these are the site-wide defaults and icons.
  return {
    metadataBase: new URL(await getSiteUrl()),
    title: {
      default: 'BLACKSHARK: Gaming PCs, PC Parts & Gaming Gear in Oman',
      template: '%s | BLACKSHARK',
    },
    applicationName: 'BLACKSHARK',
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
        { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
        { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },
    manifest: '/site.webmanifest',
  };
}

export const viewport: Viewport = {
  themeColor: '#07080b',
  colorScheme: 'dark',
  // Lets the phone's bottom bar sit clear of the iPhone home indicator.
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      {/* One shell per site, chosen here so a 404 never gets two, or the wrong one. */}
      <body>
        {isAdminSite() ? children : <StoreShell>{children}</StoreShell>}
      </body>
    </html>
  );
}
