/**
 * Server-only hex → ISO country resolver.
 *
 * 1. Strict point-in-polygon (ray casting) over a minified Natural Earth
 *    50m admin-0 boundary set.
 * 2. Coastal fallback: the 50m coastline is generalised, so tight coastal
 *    cities (Stockholm, NYC, …) fall just offshore of the polygon. If the
 *    point is within COAST_KM of a country's edge, attribute it there.
 * 3. Otherwise - genuine open ocean / Antarctica (excluded from the
 *    dataset) - return "INTL".
 *
 * Do NOT import this from client components - it pulls a ~1.7 MB JSON.
 */
import { cellToLatLng } from 'h3-js';
import boundaries from './countries-50m.min.json';

type Ring = [number, number][];
type Country = { iso: string; bbox: [number, number, number, number]; p: Ring[][] };

const COUNTRIES = boundaries as unknown as Country[];

export const INTL = 'INTL';
const COAST_KM = 35; // max distance a hex centre may sit off the generalised coast

function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function inPolygon(lng: number, lat: number, rings: Ring[]): boolean {
  if (!inRing(lng, lat, rings[0])) return false;
  for (let h = 1; h < rings.length; h++) {
    if (inRing(lng, lat, rings[h])) return false;
  }
  return true;
}

/** Squared point→segment distance in a local equirectangular km projection. */
function segDistKm2(
  lat: number,
  lng: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  kx: number,
): number {
  const px = (lng - ax) * kx;
  const py = (lat - ay) * 110.574;
  const vx = (bx - ax) * kx;
  const vy = (by - ay) * 110.574;
  const len2 = vx * vx + vy * vy;
  let t = len2 > 0 ? (px * vx + py * vy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = px - vx * t;
  const dy = py - vy * t;
  return dx * dx + dy * dy;
}

/** ISO alpha-2 (uppercase) for a lat/lng, or "INTL". */
// Microstates absent from the 50m dataset, checked before it. Vatican City
// (0.5 km²) simply doesn't exist at 50m scale - without this its hexes
// resolve to IT, which broke the launch lock. Polygon traces the wall line
// closely enough that only the state itself (plus St. Peter's Square, which
// IS the border) matches.
const MICROSTATES: Array<{ iso: string; bbox: [number, number, number, number]; ring: Ring }> = [
  {
    iso: 'VA',
    bbox: [12.4429, 41.9, 12.4584, 41.9077],
    ring: [
      [12.4454, 41.9],
      [12.4584, 41.9017],
      [12.4576, 41.9059],
      [12.4529, 41.9077],
      [12.4462, 41.9072],
      [12.4429, 41.9043],
      [12.4431, 41.9009],
      [12.4454, 41.9],
    ],
  },
];

export function resolveCountry(lat: number, lng: number): string {
  // 0. Microstate overrides (see above).
  for (const m of MICROSTATES) {
    const [minX, minY, maxX, maxY] = m.bbox;
    if (lng >= minX && lng <= maxX && lat >= minY && lat <= maxY && inRing(lng, lat, m.ring)) {
      return m.iso;
    }
  }

  // 1. Strict containment.
  for (const c of COUNTRIES) {
    const [minX, minY, maxX, maxY] = c.bbox;
    if (lng < minX || lng > maxX || lat < minY || lat > maxY) continue;
    for (const poly of c.p) {
      if (inPolygon(lng, lat, poly)) return c.iso;
    }
  }
  // 2. Coastal fallback - nearest edge within COAST_KM.
  const kx = 111.32 * Math.cos((lat * Math.PI) / 180);
  const maxD2 = COAST_KM * COAST_KM;
  const pad = COAST_KM / 100; // ~deg padding on the bbox prefilter
  let best = maxD2;
  let bestIso = INTL;
  for (const c of COUNTRIES) {
    const [minX, minY, maxX, maxY] = c.bbox;
    if (lng < minX - pad || lng > maxX + pad || lat < minY - pad || lat > maxY + pad) {
      continue;
    }
    for (const poly of c.p) {
      for (const ring of poly) {
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const d2 = segDistKm2(
            lat,
            lng,
            ring[j][0],
            ring[j][1],
            ring[i][0],
            ring[i][1],
            kx,
          );
          if (d2 < best) {
            best = d2;
            bestIso = c.iso;
          }
        }
      }
    }
  }
  return bestIso;
}

/** Rough country centroid [lng, lat] from its bounding box, or null. */
export function countryCentroid(iso: string): [number, number] | null {
  const c = COUNTRIES.find((x) => x.iso === iso.toUpperCase());
  if (!c) return null;
  const [minX, minY, maxX, maxY] = c.bbox;
  return [(minX + maxX) / 2, (minY + maxY) / 2];
}

/** ISO alpha-2 (uppercase) for an H3 cell's centre, or "INTL". */
export function resolveHexCountry(h3Id: string): string {
  let lat: number;
  let lng: number;
  try {
    [lat, lng] = cellToLatLng(h3Id);
  } catch {
    return INTL;
  }
  return resolveCountry(lat, lng);
}
