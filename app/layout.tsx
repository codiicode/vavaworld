import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tomorrowland Tiles',
  description: 'Claim a tile on the world.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[var(--bg)] text-[var(--fg)]">{children}</body>
    </html>
  );
}
