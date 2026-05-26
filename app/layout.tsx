import type { Metadata } from 'next';
import { Manrope } from 'next/font/google';
import './globals.css';

// Soft, modern grotesk — chain-agnostic, free, very close in feel to
// Neue Haas Grotesk / Söhne. Variable font so weights 300-800 are one file.
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});
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
    <html lang="en" className={manrope.variable}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
