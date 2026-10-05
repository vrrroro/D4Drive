import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import { Gridlines } from '@/components/ui/Gridlines';
import { Grain } from '@/components/ui/Grain';
import { ToastProvider } from '@/components/ui/Toast';
import { SiteNav } from '@/components/ui/SiteNav';
import './globals.css';

/**
 * Fonts are self-hosted through next/font rather than linked from Google.
 * A <link> to fonts.googleapis.com is a render-blocking third-party round trip
 * on the critical path, and it is the single easiest LCP win to give away.
 */
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  // 400 only: the type scale in DESIGN.md sets every display size at 400.
  // Each extra weight is another file racing the LCP headline for bandwidth.
  weight: ['400'],
  style: ['normal', 'italic'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  // Body at 400, UI labels and buttons at 500. Nothing uses 300.
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'D4Drive',
  description: 'Drive easy. Book smart. Delivered to you.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#f9f8f6',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${playfair.variable} ${inter.variable}`}>
      <body>
        <Gridlines />
        <ToastProvider>
          <SiteNav />
          {children}
        </ToastProvider>
        <Grain />
      </body>
    </html>
  );
}
