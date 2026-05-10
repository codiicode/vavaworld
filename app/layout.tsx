import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VAVA',
  description: 'Claim your tile on VAVAWORLD.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[var(--bg)] text-[var(--fg)]">{children}</body>
    </html>
  );
}
