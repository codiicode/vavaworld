'use client';

import dynamic from 'next/dynamic';

// WebGL globe (react-three-fiber) - client only; it can't render during the
// static prerender of the landing page.
const Globe3DLanding = dynamic(
  () => import('./Globe3DLanding').then((m) => m.Globe3DLanding),
  {
    ssr: false,
    loading: () => <div className="mx-auto h-[min(92vmin,840px)] w-full max-w-[900px]" />,
  },
);

export function MapSection() {
  return (
    <section className="l-map-sec" id="map" style={{ position: 'relative' }}>
      {/* Soft brand glow behind the Earth - no box, just ambience. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 46%, rgba(20,184,166,0.13), transparent 56%)',
        }}
      />
      <div className="l-map-inner" style={{ position: 'relative' }}>
        <Globe3DLanding />
      </div>
    </section>
  );
}
