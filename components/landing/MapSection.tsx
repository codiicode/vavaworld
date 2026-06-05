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
    <section
      className="l-map-sec"
      id="map"
      style={{ position: 'relative', background: 'linear-gradient(180deg,#f1f7fb 0%,#ffffff 100%)' }}
    >
      <div className="l-map-inner" style={{ position: 'relative' }}>
        {/* Soft light "sky" panel the Earth floats in - matches the hero's bright vibe. */}
        <div
          style={{
            position: 'relative',
            margin: '0 auto',
            width: '100%',
            maxWidth: 900,
            borderRadius: 40,
            overflow: 'hidden',
            border: '1px solid rgba(13,52,86,0.07)',
            background:
              'radial-gradient(circle at 50% 42%, rgba(20,184,166,0.16), transparent 62%), linear-gradient(180deg,#eaf4fc 0%,#dff0ec 100%)',
            boxShadow: '0 40px 90px -40px rgba(13,52,86,0.28)',
          }}
        >
          <Globe3DLanding />
        </div>
      </div>
    </section>
  );
}
