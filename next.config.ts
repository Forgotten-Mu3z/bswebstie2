import type { NextConfig } from 'next';

// Sent with every page and API response. Static files get the same basics
// from public/_headers.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Content-Security-Policy',
    value:
      "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
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
