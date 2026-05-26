'use client';

import { Minus, Plus, ZoomIn } from 'lucide-react';
import type { RefObject } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';

/**
 * Floating zoom controls on the right side of /map (under the GlassRightPanel
 * on desktop, anchored above the bottom-sheet on mobile).
 *
 *   ⊕  "Get me close" — one-tap flyTo to a zoom where individual hexes appear
 *   +  zoom in one step
 *   −  zoom out one step
 *
 * Uses the live map ref so panning / center are preserved.
 */
export function MapZoomControls({
  mapRef,
  // The "zoom in to where hexes are visible" target. H3 res-12 cells start to
  // become useful around 15-16 and clearly distinguishable at 17. We target 17
  // so the user lands on a clearly-walkable hex grid in one tap.
  closeZoom = 17,
}: {
  mapRef: RefObject<MapRef | null>;
  closeZoom?: number;
}) {
  const map = () => mapRef.current?.getMap();

  const flyClose = () => {
    const m = map();
    if (!m) return;
    const c = m.getCenter();
    m.flyTo({ center: [c.lng, c.lat], zoom: closeZoom, duration: 1200, essential: true });
  };
  const zoomIn = () => map()?.zoomIn({ duration: 250 });
  const zoomOut = () => map()?.zoomOut({ duration: 250 });

  return (
    <div
      className="pointer-events-auto fixed z-20 flex flex-col gap-2
        right-3 bottom-[calc(64vh+12px)]
        md:bottom-auto md:right-[356px] md:top-[88px]"
    >
      <ZoomBtn label="Zoom in close" onClick={flyClose} primary>
        <ZoomIn size={18} strokeWidth={1.9} />
      </ZoomBtn>
      <div className="glass flex flex-col overflow-hidden rounded-full">
        <ZoomBtn label="Zoom in" onClick={zoomIn} inGroup>
          <Plus size={18} strokeWidth={2} />
        </ZoomBtn>
        <div className="mx-2 h-px bg-white/15" />
        <ZoomBtn label="Zoom out" onClick={zoomOut} inGroup>
          <Minus size={18} strokeWidth={2} />
        </ZoomBtn>
      </div>
    </div>
  );
}

function ZoomBtn({
  label,
  onClick,
  primary,
  inGroup,
  children,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
  inGroup?: boolean;
  children: React.ReactNode;
}) {
  if (primary) {
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        className="glass grid h-11 w-11 place-items-center rounded-full text-white/90 transition-colors hover:text-white"
      >
        {children}
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={
        inGroup
          ? 'grid h-10 w-11 place-items-center text-white/85 transition-colors hover:bg-white/10 hover:text-white'
          : 'glass grid h-11 w-11 place-items-center rounded-full text-white/90 transition-colors hover:text-white'
      }
    >
      {children}
    </button>
  );
}
