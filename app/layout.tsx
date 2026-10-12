import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter, Shadows_Into_Light_Two, Six_Caps } from 'next/font/google';
import { CursorHalo } from '@/components/motion/CursorHalo';
import { SmoothScroll } from '@/components/motion/SmoothScroll';
import { Grain } from '@/components/ui/Grain';
import { SiteFooter } from '@/components/ui/SiteFooter';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { ToastProvider } from '@/components/ui/Toast';
import './globals.css';

/**
 * Self-hosted through next/font, never linked from Google: a stylesheet on
 * fonts.googleapis.com is a render-blocking third-party round trip.
 *
 * Fraunces is variable with its optical-size axis, so the same file sets a
 * 200px hairline headline and a 16px label each at its own optical size.
 * Six Caps stands in for the reference system's Humane: the same ultra-tall,
 * ultra-narrow proportions, freely licensed. The marker face is only ever
 * used for annotations, which arrive after the first paint, so it is not
 * preloaded.
 */
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  style: ['normal', 'italic'],
  axes: ['opsz'],
});

const sixCaps = Six_Caps({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-six-caps',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const marker = Shadows_Into_Light_Two({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-marker',
  display: 'swap',
  preload: false,
});

export const metadata: Metadata = {
  title: { default: 'D4Drive', template: '%s | D4Drive' },
  description: 'Drive easy. Book smart. Delivered to you. Rental cars brought to your door across Bengaluru.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#bdbcba',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${fraunces.variable} ${sixCaps.variable} ${inter.variable} ${marker.variable}`}>
      <body>
        {/* 24px into the document. HeaderTone watches it: once it has left the
            screen the page has moved, and the island firms up its glass. */}
        <div data-scroll-sentinel aria-hidden="true" className="pointer-events-none absolute left-0 top-6 h-px w-px" />
        <ToastProvider>
          <SmoothScroll />
          <SiteHeader />
          <main id="main" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <SiteFooter />
        </ToastProvider>
        <CursorHalo />
        <Grain />
      </body>
    </html>
  );
}
