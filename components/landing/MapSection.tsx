'use client';

import dynamic from 'next/dynamic';

// WebGL globe (react-three-fiber) - client only; it can't render during the
// static prerender of the landing page.
const Globe3DLanding = dynamic(
  () => import('./Globe3DLanding').then((m) => m.Globe3DLanding),
  {
    ssr: false,
    loading: () => <div className="mx-auto h-[min(86vmin,720px)] w-full max-w-[860px]" />,
  },
);

export function MapSection() {
  return (
    <section
      className="l-map-sec"
      id="map"
      style={{
        position: 'relative',
        background:
          'radial-gradient(circle at 50% 44%, rgba(20,184,166,0.16), transparent 52%), linear-gradient(180deg, #060d1c 0%, #081628 48%, #060d1c 100%)',
      }}
    >
      {/* Ease the dark band out of the light sections above/below. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(180deg, rgba(207,229,246,0.9) 0%, transparent 9%, transparent 91%, rgba(207,229,246,0.9) 100%)',
        }}
      />
      <div className="l-map-inner" style={{ position: 'relative' }}>
        <Globe3DLanding />
      </div>
    </section>
  );
}
