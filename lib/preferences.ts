/**
 * Device-local user preferences (localStorage). Written by /settings,
 * read by the surfaces they affect (the map, mainly). SSR-safe: every
 * read is guarded so it returns the default on the server / when storage
 * is unavailable.
 */

export const PREF_KEYS = {
  mapStyle: 'vava-map-style',
  mapView: 'vava-map-view',
  currency: 'vava-currency',
} as const;

export type MapStylePref = 'satellite' | 'standard';
export type MapViewPref = '2d' | '3d';

function read(key: string): string | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function getMapStyle(): MapStylePref {
  return read(PREF_KEYS.mapStyle) === 'standard' ? 'standard' : 'satellite';
}

export function getMapView(): MapViewPref {
  return read(PREF_KEYS.mapView) === '3d' ? '3d' : '2d';
}
