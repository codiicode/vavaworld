'use client';

import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { getMapView } from '@/lib/preferences';

/**
 * 2D / 3D camera toggle (the Apple-Maps-style pill). Eases the map pitch
 * between flat top-down (0°) and a tilted 3D view (60°). At tilt, the
 * Mapbox Standard "map view" base renders real 3D landmarks (Eiffel
 * Tower, Marina Bay Sands, etc.) and extruded buildings as they look;
 * on satellite you get angled imagery + terrain. The label shows the
 * mode you'd switch TO, matching the other map pills.
 */
const TILT_PITCH = 60;

export function MapPerspectiveToggle({ mapRef }: { mapRef: RefObject<MapRef | null> }) {
  const [is3d, setIs3d] = useState(false);
  // Reflect the saved default view so the pill's label is right on open
  // (MapView applies the actual pitch).
  useEffect(() => {
    setIs3d(getMapView() === '3d');
  }, []);

  const toggle = () => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const next = !is3d;
    setIs3d(next);
    map.easeTo({ pitch: next ? TILT_PITCH : 0, duration: 600 });
  };

  const label = is3d ? 'Switch to 2D view' : 'Switch to 3D view';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="glass pointer-events-auto relative grid h-11 w-11 flex-none place-items-center rounded-full text-[13px] font-semibold text-white/80 transition-colors hover:text-white"
    >
      <span className="relative z-[1]">{is3d ? '2D' : '3D'}</span>
    </button>
  );
}
