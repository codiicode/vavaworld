'use client';

import Link from 'next/link';
import { Globe } from './Globe';

export function MapSection() {
  return (
    <section className="l-map-sec" id="map">
      <div className="l-map-inner">
        <Globe />
        <div className="l-ctas">
          <Link href="/map" className="l-btn l-btn-primary">Open the map</Link>
        </div>
      </div>
    </section>
  );
}
