import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import 'flag-icons/css/flag-icons.min.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Providers } from './providers';

// Every surface is near-black; without an explicit theme-color iOS Safari
// tints its top/bottom bars a mismatched slate. viewport-fit lets the page
// paint into the safe areas so the app runs edge to edge.
export const viewport: Viewport = {
  themeColor: '#000000',
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://vavaworld.fun'),
  title: {
    default: '$VAVA · VAVAWORLD',
    template: '%s · VAVAWORLD',
  },
  description:
    'Claim hexes on a live world map. Buy, sell, and trade pieces of the earth on VAVAWORLD.',
  applicationName: 'VAVAWORLD',
  openGraph: {
    type: 'website',
    siteName: 'VAVAWORLD',
    title: '$VAVA · VAVAWORLD',
    description:
      'Claim hexes on a live world map. Buy, sell, and trade pieces of the earth.',
    url: 'https://vavaworld.fun',
    images: [{ url: '/logo.jpg', width: 1200, height: 630, alt: 'VAVAWORLD' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '$VAVA · VAVAWORLD',
    description:
      'Claim hexes on a live world map. Buy, sell, and trade pieces of the earth.',
    images: ['/logo.jpg'],
  },
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={GeistSans.variable}>
      <body className="font-sans">
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
