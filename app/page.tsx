import './landing.css';
import { CloudField } from '@/components/landing/CloudField';
import { SiteNav } from '@/components/landing/SiteNav';
import { Hero } from '@/components/landing/Hero';
import { MapSection } from '@/components/landing/MapSection';
import { Register } from '@/components/landing/Register';
import { Door } from '@/components/landing/Door';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { SiteFooter } from '@/components/landing/SiteFooter';

export default function LandingPage() {
  return (
    <div className="landing-root">
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
