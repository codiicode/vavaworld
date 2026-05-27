import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'VAVA',
  description: 'Claim your hex on VAVAWORLD.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: '#c2d8f4',
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
