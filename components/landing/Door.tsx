'use client';

import Link from 'next/link';

export function Door() {
  return (
    <section className="l-door" id="door">
      <div className="l-bg" />
      <div className="l-veil" />
      <div className="l-door-fade-top" />
      <div className="l-door-fade-bot" />
      <div className="l-copy">
        <span className="l-eyebrow">iii — The passage</span>
        <div className="l-end-row">
          <h2>
            Step through.<br />
            Take your <em>cell.</em>
          </h2>
          <div className="l-right">
            <p>
              Eighteen thousand cells held. Ninety-nine and nine-eighths of a million remaining.
              The register fills only once.
            </p>
            <div className="l-ctas">
              <Link href="/map" className="l-btn l-btn-ghost">Open the map</Link>
              <a href="#how" className="l-btn l-btn-overlay-ghost">Read the letter</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
