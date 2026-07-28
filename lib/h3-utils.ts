import { polygonToCells, cellToBoundary, cellToLatLng } from 'h3-js';
import type { Feature, Polygon } from 'geojson';

export const HEX_RES = 12 as const;
// Hard ceiling on cells painted per viewport. Paired with MIN_ZOOM_FOR_HEXES=16
// in MapView (a z16 viewport is ~2k res-12 cells), so this is a safety net, not
// the common path. Keeping it low means the worst-case synchronous polygonToCells
// + GeoJSON build can never balloon into the 100ms+ stutter range.
const SAFETY_CAP = 4000;

export type Bbox = [west: number, south: number, east: number, north: number];

export function hexesForBounds(bbox: Bbox, res: number = HEX_RES): string[] {
  const [w, s, e, n] = bbox;
  // h3-js v4 polygonToCells expects [lat, lng] vertices, GeoJSON ring closed.
  const ring: [number, number][] = [
    [s, w],
    [s, e],
    [n, e],
    [n, w],
    [s, w],
  ];
  // A wide box at the target res is millions of cells - clamp resolution down
  // for large viewports to keep the result tractable.
  const effectiveRes = estimateSafeRes(bbox, res);
  const cells = polygonToCells([ring], effectiveRes);
  return cells.length > SAFETY_CAP ? cells.slice(0, SAFETY_CAP) : cells;
}

function estimateSafeRes(bbox: Bbox, requested: number): number {
  const [w, s, e, n] = bbox;
  const areaDeg = Math.max(0.0001, (e - w) * (n - s));
  // Drop two res levels per ~50x area increase past a small viewport.
  if (areaDeg > 5000) return Math.max(2, requested - 6);
  if (areaDeg > 500) return Math.max(4, requested - 4);
  if (areaDeg > 50) return Math.max(6, requested - 2);
  if (areaDeg > 5) return Math.max(8, requested - 1);
  return requested;
}

export function hexToFeature(h3: string): Feature<Polygon> {
  // cellToBoundary returns [lat, lng]; GeoJSON wants [lng, lat].
  const boundary = cellToBoundary(h3) as [number, number][];
  const coords = boundary.map(([lat, lng]) => [lng, lat]);
  coords.push(coords[0]);
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: { h3 },
  };
}

export function hexCenter(h3: string): { lat: number; lng: number } {
  const [lat, lng] = cellToLatLng(h3);
  return { lat, lng };
}
