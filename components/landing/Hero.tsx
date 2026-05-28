'use client';

import Image from 'next/image';
import Link from 'next/link';
import { HeroParticles } from './HeroParticles';

export function Hero() {
  return (
    <section className="l-hero">
      <div className="l-bg">
        <Image
          src="/hero-astronaut.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          quality={85}
        />
      </div>
      <div className="l-glow-pulse" />
      <div className="l-haze" />
      <HeroParticles />
      <div className="l-veil" />
      <div className="l-vignette" />
      <div className="l-grain" />
      <div className="l-copy">
        <h1>
          The oldest currency in <em>human history.</em><br />
          Now digital.
        </h1>
        <div className="l-row">
          <p className="l-lead">
            Vavaworld divides the surface of the earth into one hundred million hexagonal cells.
            Each cell is held by exactly one person - in their name, without expiry.
          </p>
          <div className="l-ctas">
            <Link href="/map" className="l-btn l-btn-ghost">Open the map</Link>
            <a href="#how" className="l-btn l-btn-overlay-ghost">How it works</a>
          </div>
        </div>
      </div>
      <div className="l-hero-fade" />
    </section>
  );
}
