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
    <section className="l-map-sec" id="map">
      <div className="l-map-inner">
        <Globe3DLanding />
      </div>
    </section>
  );
}
