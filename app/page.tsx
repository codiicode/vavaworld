import { Manrope } from 'next/font/google';
import './landing.css';
import { CloudField } from '@/components/landing/CloudField';
import { SiteNav } from '@/components/landing/SiteNav';
import { Hero } from '@/components/landing/Hero';
import { MapSection } from '@/components/landing/MapSection';
import { Register } from '@/components/landing/Register';
import { Door } from '@/components/landing/Door';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { SiteFooter } from '@/components/landing/SiteFooter';

// Soft sans for the landing page only — the app routes keep GeistSans via
// the root layout. Applying className on .landing-root scopes it locally.
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-manrope',
});

export default function LandingPage() {
  return (
    <div className={`landing-root ${manrope.variable} ${manrope.className}`}>
      <CloudField />
      <SiteNav />
      <Hero />
      <MapSection />
      <Register />
      <Door />
      <HowItWorks />
      <SiteFooter />
    </div>
  );
}
