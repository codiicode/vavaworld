import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { hexCenter } from './h3-utils';
import type { Tier } from './tier';
import type { HexLocation } from './use-hex-locations';
import type { ClaimedTile } from '@/types/tile';

/**
 * A "property" — every tile claimed in the same transaction (and therefore
 * sharing the same `claimedAt` second) is grouped into one TileGroup so the
 * UI can render it as a single card instead of N copies of the same purchase.
 */
export type TileGroup = {
  /** Stable React key — the shared claimedAt second. */
  key: string;
  /** Hexes in this property, h3-sorted for stable rendering. */
  tiles: ClaimedTile[];
  /** Unix seconds — the moment of purchase. */
  claimedAt: number;
  /** Total SOL paid across the property. */
  totalSol: number;
  /** Most common tier — used for the tile badge. */
  representativeTier: Tier;
  /** Mean lat/lng across all hex centers — preview map center. */
  centerLat: number;
  centerLng: number;
  /** Mapbox zoom that frames the whole property comfortably. */
  zoom: number;
  /** Pre-formatted city label (e.g. "Stockholm" or "Tokyo · Paris +2"). */
  citiesLabel: string;
  /** Primary country (most common across the group). */
  countryCode: string | null;
  countryName: string | null;
  /** Neighborhood — only if every hex shares one. */
  neighborhood: string | null;
};

export function groupTilesByClaim(
  tiles: ClaimedTile[],
  locations: Map<string, HexLocation | undefined>,
): TileGroup[] {
  // Bucket by claimedAt second — Postgres `now()` is transaction-start, and
  // Solana block_time has 1-second granularity, so all tiles claimed in one TX
  // share the same value.
  const buckets = new Map<number, ClaimedTile[]>();
  for (const t of tiles) {
    const arr = buckets.get(t.claimedAt);
    if (arr) arr.push(t);
    else buckets.set(t.claimedAt, [t]);
  }

  const out: TileGroup[] = [];
  for (const [claimedAt, list] of buckets) {
    const sorted = [...list].sort((a, b) => (a.h3 < b.h3 ? -1 : 1));
    const totalSol =
      sorted.reduce((s, t) => s + Number(t.pricePaid), 0) / LAMPORTS_PER_SOL;

    const centers = sorted.map((t) => hexCenter(t.h3));
    const centerLat = centers.reduce((s, c) => s + c.lat, 0) / centers.length;
    const centerLng = centers.reduce((s, c) => s + c.lng, 0) / centers.length;

    // Frame the property: find max distance from the centroid (with longitude
    // scaled by cos(lat) so spans behave near the poles), then pick a zoom
    // where everything fits comfortably. Step values are rough — they work
    // for the contiguous batches that real users produce.
    const latRad = (centerLat * Math.PI) / 180;
    const maxLatSpread = Math.max(...centers.map((c) => Math.abs(c.lat - centerLat)));
    const maxLngSpread =
      Math.max(...centers.map((c) => Math.abs(c.lng - centerLng))) * Math.cos(latRad);
    const maxSpreadMeters = Math.max(maxLatSpread, maxLngSpread) * 111_000;
    let zoom = 17;
    if (maxSpreadMeters > 80) zoom = 16;
    if (maxSpreadMeters > 220) zoom = 15;
    if (maxSpreadMeters > 500) zoom = 14;
    if (maxSpreadMeters > 1200) zoom = 13;
    if (maxSpreadMeters > 3000) zoom = 12;
    if (maxSpreadMeters > 8000) zoom = 11;

    const tierTally = new Map<Tier, number>();
    for (const t of sorted) tierTally.set(t.tier, (tierTally.get(t.tier) ?? 0) + 1);
    const representativeTier =
      [...tierTally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? (1 as Tier);

    const cityTally = new Map<string, number>();
    const countryTally = new Map<string, number>();
    const codeTally = new Map<string, number>();
    const neighborhoodTally = new Map<string, number>();
    for (const t of sorted) {
      const loc = locations.get(t.h3);
      if (loc?.place) cityTally.set(loc.place, (cityTally.get(loc.place) ?? 0) + 1);
      if (loc?.countryName)
        countryTally.set(loc.countryName, (countryTally.get(loc.countryName) ?? 0) + 1);
      if (loc?.countryCode)
        codeTally.set(loc.countryCode, (codeTally.get(loc.countryCode) ?? 0) + 1);
      if (loc?.neighborhood)
        neighborhoodTally.set(loc.neighborhood, (neighborhoodTally.get(loc.neighborhood) ?? 0) + 1);
    }
    const topCities = [...cityTally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([c]) => c);
    const more = cityTally.size > 3 ? ` +${cityTally.size - 3}` : '';
    const citiesLabel = topCities.length > 0 ? topCities.join(' · ') + more : '—';

    out.push({
      key: String(claimedAt),
      tiles: sorted,
      claimedAt,
      totalSol,
      representativeTier,
      centerLat,
      centerLng,
      zoom,
      citiesLabel,
      countryCode: topOf(codeTally),
      countryName: topOf(countryTally),
      neighborhood: neighborhoodTally.size === 1 ? topOf(neighborhoodTally) : null,
    });
  }

  return out.sort((a, b) => b.claimedAt - a.claimedAt);
}

function topOf<T>(map: Map<T, number>): T | null {
  let best: T | null = null;
  let bestN = -1;
  for (const [k, v] of map) {
    if (v > bestN) {
      bestN = v;
      best = k;
    }
  }
  return best;
}
