import { Inter } from 'next/font/google';
import './landing.css';
import { CloudField } from '@/components/landing/CloudField';
import { SiteNav } from '@/components/landing/SiteNav';
import { Hero } from '@/components/landing/Hero';
import { LiveTicker } from '@/components/landing/LiveTicker';
import { MapSection } from '@/components/landing/MapSection';
import { Register } from '@/components/landing/Register';
import { Door } from '@/components/landing/Door';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { SiteFooter } from '@/components/landing/SiteFooter';

// Landing uses Inter as a free, near-identical stand-in for Neue Haas Grotesk
// (Linotype, commercial license). Swap to the real face by replacing this
// import with a self-hosted @font-face once the .woff2 files are licensed -
// the CSS variable name stays the same so no other file needs to change.
const groteskFont = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-manrope',
});

export default function LandingPage() {
  return (
    <div className={`landing-root ${groteskFont.variable} ${groteskFont.className}`}>
      <CloudField />
      <SiteNav />
      <Hero />
      <LiveTicker />
      <MapSection />
      <Register />
      <Door />
      <HowItWorks />
      <SiteFooter />
    </div>
  );
}
