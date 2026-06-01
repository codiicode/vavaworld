'use client';

import { Globe } from './Globe';

export function MapSection() {
  return (
    <section className="l-map-sec" id="map">
      <div className="l-map-inner">
        <Globe />
      </div>
    </section>
  );
}
