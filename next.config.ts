import type { NextConfig } from 'next';

/**
 * Security headers that are identical on every request.
 *
 * The Content Security Policy is deliberately NOT here. It carries a per
 * request nonce, which a static header cannot express, so it lives in
 * middleware.ts. Next injects its RSC payload as inline script tags, and a
 * policy without a matching nonce blocks them, leaving a correctly
 * server-rendered page that hydrates into a blank body.
 */

const securityHeaders = [
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

  // pdfkit reads its standard font metrics (Helvetica.afm and friends) from
  // its own package directory at runtime. Bundled by webpack, those paths
  // point inside .next/ where the files do not exist, and every invoice 500s
  // in a production build while working fine under `next dev`.
  serverExternalPackages: ['pdfkit'],

  // Browsers still ask for /favicon.ico directly, whatever the page head
  // declares. Serve the generated app/icon there rather than a 404.
  async rewrites() {
    return [{ source: '/favicon.ico', destination: '/icon' }];
  },

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
      {
        // The landing film's stills. The folder is versioned (v1, v2...) by
        // scripts/build-film-frames.mjs, so a changed frame gets a new URL.
        source: '/film/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // Fleet photographs. They share /cars/ with the car pages, so the rule
        // matches image files only, and an admin can replace one in place, so
        // it is cached for a day rather than forever.
        source: '/cars/:file([\\w-]+\\.(?:webp|avif|jpe?g|png))',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
    ];
  },
};

export default nextConfig;
