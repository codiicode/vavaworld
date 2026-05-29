'use client';

import { Map as MapIcon, Satellite } from 'lucide-react';

/**
 * Glass pill button to the right of the search bar. Toggles the satellite
 * raster overlay on/off over the persistent Mapbox Standard base (which also
 * renders 3D buildings + landmarks when zoomed in). Toggling is instant - it
 * flips a layer's visibility rather than reloading the map style. Icon shown =
 * the view you'd switch TO.
 */
export function MapStyleToggle({
  satellite,
  onChange,
}: {
  satellite: boolean;
  onChange: (next: boolean) => void;
}) {
  const isSatellite = satellite;
  const label = isSatellite ? 'Switch to map view' : 'Switch to satellite view';
  return (
    <button
      type="button"
      onClick={() => onChange(!satellite)}
      aria-label={label}
      title={label}
      className="glass pointer-events-auto relative grid h-11 w-11 flex-none place-items-center rounded-full text-white/80 transition-colors hover:text-white"
    >
      <span className="relative z-[1]">
        {isSatellite ? <MapIcon size={20} strokeWidth={1.8} /> : <Satellite size={20} strokeWidth={1.8} />}
      </span>
    </button>
  );
}
