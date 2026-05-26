'use client';

import { Map as MapIcon, Satellite } from 'lucide-react';

export type MapStyleId =
  | 'mapbox://styles/mapbox/satellite-streets-v12'
  | 'mapbox://styles/mapbox/standard';

const STANDARD: MapStyleId = 'mapbox://styles/mapbox/standard';
// satellite-streets keeps the satellite imagery + overlays street/place labels.
const SATELLITE: MapStyleId = 'mapbox://styles/mapbox/satellite-streets-v12';

/**
 * Glass pill button to the right of the search bar. Clicking it toggles the
 * underlying Mapbox style between satellite imagery and Mapbox Standard —
 * the political/streets view that ALSO renders 3D buildings and famous
 * landmarks (Eiffel Tower, Burj Khalifa, etc.) when zoomed in. Globe
 * projection on both styles. Icon shown = style you'd switch TO.
 */
export function MapStyleToggle({
  value,
  onChange,
}: {
  value: MapStyleId;
  onChange: (next: MapStyleId) => void;
}) {
  const isSatellite = value === SATELLITE;
  const next = isSatellite ? STANDARD : SATELLITE;
  const label = isSatellite ? 'Switch to map view' : 'Switch to satellite view';
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={label}
      title={label}
      className="glass pointer-events-auto relative grid h-[52px] w-[52px] flex-none place-items-center rounded-full text-white/80 transition-colors hover:text-white"
    >
      <span className="relative z-[1]">
        {isSatellite ? <MapIcon size={20} strokeWidth={1.8} /> : <Satellite size={20} strokeWidth={1.8} />}
      </span>
    </button>
  );
}
