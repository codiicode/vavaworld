import { TIER1_LAT_DELTA_DEG, TIER2_LAT_DELTA_DEG, TOP_100_CITIES } from './cities';

export type Tier = 1 | 2 | 3;

/**
 * Geographic tier classifier - mirrors the on-chain bbox check in
 * anchor/programs/tiles/src/tier.rs. Each city stores precomputed longitude
 * deltas for the T1 (50 km) and T2 (200 km) radii so this can be a pure
 * bbox compare (no haversine). Off-chain quotes must match the on-chain
 * classification exactly or the slippage guard will reject the claim tx.
 */
export function classifyTier(lat: number, lng: number): Tier {
  for (const c of TOP_100_CITIES) {
    if (
      Math.abs(lat - c.lat) < TIER1_LAT_DELTA_DEG &&
      Math.abs(lng - c.lng) < c.lngD1
    ) {
      return 1;
    }
  }
  for (const c of TOP_100_CITIES) {
    if (
      Math.abs(lat - c.lat) < TIER2_LAT_DELTA_DEG &&
      Math.abs(lng - c.lng) < c.lngD2
    ) {
      return 2;
    }
  }
  return 3;
}

export const TIER_FILL: Record<Tier, string> = {
  1: '#f4a026',
  2: '#14b8a6',
  3: '#6b727a',
};
