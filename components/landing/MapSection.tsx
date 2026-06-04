'use client';

import dynamic from 'next/dynamic';
import { BackgroundGradientAnimation } from '@/components/ui/background-gradient-animation';

// WebGL globe (react-three-fiber) - client only; it can't render during the
// static prerender of the landing page.
const Globe3DLanding = dynamic(
  () => import('./Globe3DLanding').then((m) => m.Globe3DLanding),
  {
    ssr: false,
    loading: () => <div className="mx-auto h-[min(125vmin,1180px)] w-full max-w-[1180px]" />,
  },
);

export function MapSection() {
  return (
    <section className="l-map-sec" id="map" style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Animated teal-on-navy gradient blobs behind the globe (brand vibe). */}
      <BackgroundGradientAnimation
        containerClassName="!absolute !inset-0 !z-0 !h-full !w-full"
        gradientBackgroundStart="rgb(6, 13, 28)"
        gradientBackgroundEnd="rgb(8, 20, 40)"
        firstColor="20, 184, 166"
        secondColor="94, 234, 212"
        thirdColor="13, 148, 136"
        fourthColor="45, 212, 191"
        fifthColor="22, 78, 99"
        pointerColor="94, 234, 212"
        interactive={false}
        blendingValue="hard-light"
      />

      {/* Ease the dark band out of the light sections above/below. */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background:
            'linear-gradient(180deg, rgba(207,229,246,0.95) 0%, transparent 10%, transparent 90%, rgba(207,229,246,0.95) 100%)',
        }}
      />

      <div className="l-map-inner" style={{ position: 'relative', zIndex: 2 }}>
        <Globe3DLanding />
      </div>
    </section>
  );
}
