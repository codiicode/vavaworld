import { TOP_100_CITIES } from './cities';

export type Tier = 1 | 2 | 3;

const R_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function classifyTier(lat: number, lng: number): Tier {
  let min = Infinity;
  for (const c of TOP_100_CITIES) {
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < min) min = d;
    if (min < 50) return 1;
  }
  if (min < 50) return 1;
  if (min < 200) return 2;
  return 3;
}

export const TIER_FILL: Record<Tier, string> = {
  1: '#f4a026',
  2: '#14b8a6',
  3: '#6b727a',
};
