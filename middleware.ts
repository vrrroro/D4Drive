import { NextResponse, type NextRequest } from 'next/server';

/**
 * Nonce-based Content Security Policy.
 *
 * This has to live in middleware rather than in `next.config.ts` headers,
 * because a nonce must be unique per request and a static header cannot be.
 *
 * The reason it matters: Next injects its RSC payload and bootstrap as INLINE
 * `<script>` tags. A policy of `script-src 'self'` blocks them, the payload
 * never arrives, and React tears the hydrated tree down to an empty body. The
 * page still server-renders correctly, so the failure looks like a blank screen
 * with a 200 response, which is a genuinely confusing thing to debug.
 *
 * `strict-dynamic` lets the nonced bootstrap load the chunks it needs without
 * having to allowlist every chunk URL.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  const csp = [
    "default-src 'self'",
    // 'unsafe-eval' is dev only: the webpack dev runtime and React Refresh
    // both need it. It is absent from production.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    // Next injects inline styles for the font loader and streamed payloads.
    // Narrowing this to a nonce is the next hardening step.
    "style-src 'self' 'unsafe-inline'",
    "media-src 'self'",
    // picsum.photos serves the seeded fleet photography.
    "img-src 'self' data: blob: https://picsum.photos https://fastly.picsum.photos",
    "font-src 'self' data:",
    "connect-src 'self'" + (isDev ? ' ws: wss:' : ''),
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

  // Next reads this request header and stamps the nonce onto the scripts it
  // generates. Without it, our own bootstrap would be blocked by our own policy.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  matcher: [
    /**
     * Everything except static assets and image optimisation, which are served
     * by Next itself and do not execute script.
     */
    {
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
