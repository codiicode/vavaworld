import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import 'flag-icons/css/flag-icons.min.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  metadataBase: new URL('https://vavaworld.fun'),
  title: {
    default: '$VAVA · vavaworld',
    template: '%s · vavaworld',
  },
  description:
    'Claim hexes on a live world map. Buy, sell, and trade pieces of the earth on vavaworld.',
  applicationName: 'vavaworld',
  openGraph: {
    type: 'website',
    siteName: 'vavaworld',
    title: '$VAVA · vavaworld',
    description:
      'Claim hexes on a live world map. Buy, sell, and trade pieces of the earth.',
    url: 'https://vavaworld.fun',
    images: [{ url: '/logo.jpg', width: 1200, height: 630, alt: 'vavaworld' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '$VAVA · vavaworld',
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
      </body>
    </html>
  );
}
