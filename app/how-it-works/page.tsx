import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Link from 'next/link';
import '../landing.css';
import { BrandLogo } from '@/components/brand-logo';
import { HowItWorks } from '@/components/landing/HowItWorks';

const grotesk = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'How it works',
  description: 'Three small, deliberate acts - from any place on the earth to a cell that is permanently yours.',
};

export default function HowItWorksPage() {
  return (
    <div className={`landing-root ${grotesk.variable} ${grotesk.className}`} style={{ minHeight: '100vh' }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-8 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <BrandLogo size={32} className="[filter:brightness(0)]" />
          <span
            className="text-lg tracking-[0.02em]"
            style={{ fontFamily: '"StretchPro", "Abril Fatface", Georgia, serif', color: '#0b1a2e' }}
          >
            VAVAWORLD
          </span>
        </Link>
        <Link href="/" className="text-sm font-medium" style={{ color: '#5b7088' }}>
          ← Back
        </Link>
      </header>

      <HowItWorks />

      <div className="flex justify-center px-6 pb-28">
        <Link
          href="/map"
          className="rounded-full bg-[#000000] px-12 py-4 text-base transition-transform hover:scale-[1.03]"
          style={{ color: '#ffffff' }}
        >
          Enter VavaWorld
        </Link>
      </div>
    </div>
  );
}
