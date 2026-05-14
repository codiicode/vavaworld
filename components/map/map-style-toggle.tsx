'use client';

import { Map as MapIcon, Satellite } from 'lucide-react';

export type MapStyleId =
  | 'mapbox://styles/mapbox/satellite-v9'
  | 'mapbox://styles/mapbox/streets-v12';

const STREETS: MapStyleId = 'mapbox://styles/mapbox/streets-v12';
const SATELLITE: MapStyleId = 'mapbox://styles/mapbox/satellite-v9';

/**
 * Glass pill button to the right of the search bar. Clicking it toggles the
 * underlying Mapbox style between satellite imagery and the streets style
 * (country borders, names, major-city labels — the Earth2-style political
 * view). The icon shown is the style you'd switch TO, not the current one.
 */
export function MapStyleToggle({
  value,
  onChange,
}: {
  value: MapStyleId;
  onChange: (next: MapStyleId) => void;
}) {
  const isSatellite = value === SATELLITE;
  const next = isSatellite ? STREETS : SATELLITE;
  const label = isSatellite ? 'Switch to streets view' : 'Switch to satellite view';
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
