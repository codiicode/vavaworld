'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Globe } from './Globe';

export function MapSection() {
  const [claimed, setClaimed] = useState(18432);

  // Mirror the reference's "live register" cadence: bump claimed total every 2.2s.
  // Real on-chain wiring can hook into the counters hook later - keep the visual liveness here.
  useEffect(() => {
    const id = window.setInterval(() => setClaimed((v) => v + 1), 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="l-map-sec" id="map">
      <div className="l-map-inner">
        <div className="l-map-text">
          <h2>
            The world,<br />
            at <em>true scale.</em>
          </h2>
          <p>
            Real coordinates. Real ground. A house, a corner, a clearing in a forest - choose a
            place that has not yet been taken, and hold it in your name.
          </p>
          <div className="l-stats">
            <div className="l-stat-big">
              <span className="l-v">{claimed.toLocaleString('en-US')}</span>
              <span className="l-k">cells held, of one hundred million.</span>
            </div>
            <div className="l-stat-big">
              <span className="l-v">112</span>
              <span className="l-k">cities entered into the register.</span>
            </div>
            <div className="l-stat-big">
              <span className="l-v">0.018%</span>
              <span className="l-k">of the earth claimed, to date.</span>
            </div>
          </div>
          <div className="l-ctas">
            <Link href="/map" className="l-btn l-btn-primary">Open the map</Link>
          </div>
        </div>
        <Globe />
      </div>
    </section>
  );
}
