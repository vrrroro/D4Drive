import type { NextConfig } from 'next';

/**
 * Content Security Policy.
 *
 * This has to be authored by hand rather than defaulted, because the intro
 * sequence needs permissions a default policy denies: `media-src` for the hero
 * film and `data:` images for the SVG grain layer.
 *
 * `style-src 'unsafe-inline'` is present because Next injects inline styles for
 * the font loader and for streamed RSC payloads. Narrow this to a nonce before
 * any real deployment. It is the one directive here that is weaker than it
 * should be, and leaving it undocumented is how it stays that way.
 */
const csp = [
  "default-src 'self'",
  "media-src 'self'",
  "img-src 'self' data: blob:",
  "script-src 'self'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''),
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  {
    key: 'Permissions-Policy',
    value: 'geolocation=(), camera=(), microphone=(), payment=(), usb=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Generated video and poster assets are content-addressed by the build
        // script and never mutate in place, so they can be cached hard.
        source: '/videos/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/posters/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
