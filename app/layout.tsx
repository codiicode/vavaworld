import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import 'flag-icons/css/flag-icons.min.css';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://vavaworld.fun'),
  title: {
    default: '$VAVA · VavaWorld',
    template: '%s · VavaWorld',
  },
  description:
    'Claim hexes on a live world map. Buy, sell, and trade pieces of the earth on VavaWorld.',
  applicationName: 'VavaWorld',
  openGraph: {
    type: 'website',
    siteName: 'VavaWorld',
    title: '$VAVA · VavaWorld',
    description:
      'Claim hexes on a live world map. Buy, sell, and trade pieces of the earth.',
    url: 'https://vavaworld.fun',
    images: [{ url: '/logo.jpg', width: 1200, height: 630, alt: 'VavaWorld' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '$VAVA · VavaWorld',
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
