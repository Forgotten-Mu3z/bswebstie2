import type { NextConfig } from 'next';

// Everything the pages load comes from the site itself: fonts are
// self-hosted, product photos are local files, and the only other domains
// (api.whatsapp.com, instagram.com) are plain links, which CSP does not
// restrict. 'unsafe-inline' scripts are needed for the framework's inline
// hydration data (it has no nonce support); data: and blob: images are the
// admin's QR code and photo previews. Adding any third-party script, font,
// image or API call means adding its origin here first.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

// Sent with every page and API response. Static files get the same basics
// from public/_headers.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
];

const nextConfig: NextConfig = {
  // Always put <title>, description, canonical and social tags in <head>.
  // By default they are streamed into <body> for everyone except a short list
  // of bots, which leaves out most AI crawlers and anything reading raw HTML.
  htmlLimitedBots: /./,
  async headers() {
    return [
      // "/:path*" does not match the bare home page in vinext, so list it too.
      { source: '/', headers: securityHeaders },
      { source: '/:path*', headers: securityHeaders },
    ];
  },
};

export default nextConfig;
