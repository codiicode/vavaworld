'use client';

import Link from 'next/link';

export function Door() {
  return (
    <section className="l-door" id="door">
      <div className="l-bg">
        <video
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260503_162107_3cd240af-dff4-4396-b8b7-22e25c9adb1c.mp4"
          autoPlay
          loop
          muted
          playsInline
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div className="l-veil" />
      <div className="l-door-fade-top" />
      <div className="l-door-fade-bot" />
      <div className="l-copy">
        <div className="l-end-row">
          <h2>
            Step through.<br />
            Take your <em>cell.</em>
          </h2>
          <div className="l-right">
            <p>
              One hundred million cells. Each one held once, in a name, without expiry.
              The register fills only once.
            </p>
            <div className="l-ctas">
              <Link href="/map" className="l-btn l-btn-ghost">Open the map</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
