import { polygonToCells, cellToBoundary, cellToLatLng } from 'h3-js';
import type { Feature, Polygon } from 'geojson';

export const HEX_RES = 9 as const;
const SAFETY_CAP = 20000;

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
  // At res 10 a worldwide box is millions of cells — clamp resolution to keep result tractable.
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
