import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Inter } from 'next/font/google';
import { Gridlines } from '@/components/ui/Gridlines';
import { Grain } from '@/components/ui/Grain';
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
  // Playfair Display has no 300 weight. 400 is its lightest.
  weight: ['400', '500'],
  style: ['normal', 'italic'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['300', '400', '500'],
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
        {children}
        <Grain />
      </body>
    </html>
  );
}
