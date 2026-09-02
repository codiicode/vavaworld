'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getPublicClient, h3ToUint64, TILES_ABI, TILES_ADDRESS } from './evm';
import { useClaimDoneListener } from './claim-events';
import type { ClaimedTile } from '@/types/tile';
import type { Tier } from './tier';

/**
 * On-chain claimed-status for a set of hexes, straight from the VavaTiles
 * contract. Same surface as the old Solana hook so MapView / the right
 * panel / ClaimModal are untouched: a cache of h3 -> ClaimedTile | null.
 *
 * Price paid is NOT on-chain in the EVM contract (it lives in the Claimed
 * event + the Supabase registry), so pricePaid is always 0n here - price
 * display reads the registry.
 */

const BATCH = 100;
const CONCURRENCY = 8;
const ZERO = '0x0000000000000000000000000000000000000000';

/** Cache: h3 → ClaimedTile (claimed) | null (fetched, unclaimed) */
type Cache = Map<string, ClaimedTile | null>;

// Module-level so the cache survives navigation - re-entering the map
// paints instantly for already-seen cells.
const GLOBAL_TILE_CACHE: Cache = new Map();
const MAX_CACHE = 60_000;

function capCache() {
  if (GLOBAL_TILE_CACHE.size <= MAX_CACHE) return;
  const excess = GLOBAL_TILE_CACHE.size - MAX_CACHE;
  const it = GLOBAL_TILE_CACHE.keys();
  for (let i = 0; i < excess; i++) {
    const k = it.next().value;
    if (k !== undefined) GLOBAL_TILE_CACHE.delete(k);
  }
}

type HexTuple =
  | readonly [string, number, number, boolean, bigint, bigint]
  | { owner: string; claimedAt: number; tier: number; paidInUsdg: boolean; pendingAmount: bigint; embeddedVava: bigint };

function toTile(h3: string, hex: HexTuple): ClaimedTile | null {
  const owner = Array.isArray(hex) ? hex[0] : (hex as { owner: string }).owner;
  if (!owner || owner === ZERO) return null;
  const claimedAt = Number(Array.isArray(hex) ? hex[1] : (hex as { claimedAt: number }).claimedAt);
  const tier = Number(Array.isArray(hex) ? hex[2] : (hex as { tier: number }).tier);
  return {
    h3,
    owner,
    tier: (tier || 3) as Tier,
    claimedAt,
    paidUsd: 0,
    tx: null,
  };
}

export function useTiles(visibleHexes: string[]): {
  tiles: Cache;
  refresh: (h3s: string[]) => Promise<void>;
} {
  const [tiles, setTiles] = useState<Cache>(() => new Map(GLOBAL_TILE_CACHE));
  const cacheRef = useRef<Cache>(GLOBAL_TILE_CACHE);
  // Monotonic token: only the newest viewport fetch may commit results.
  const reqTokenRef = useRef(0);

  const fetchH3s = useCallback(async (h3s: string[]) => {
    if (h3s.length === 0 || !TILES_ADDRESS) return;
    const client = getPublicClient();

    const toFetch = h3s.filter((h) => !cacheRef.current.has(h));
    if (toFetch.length === 0) return;

    const myToken = ++reqTokenRef.current;
    const batches: string[][] = [];
    for (let i = 0; i < toFetch.length; i += BATCH) batches.push(toFetch.slice(i, i + BATCH));

    for (let i = 0; i < batches.length; i += CONCURRENCY) {
      const wave = batches.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        wave.map((slice) =>
          Promise.all(
            slice.map((h) =>
              client
                .readContract({
                  address: TILES_ADDRESS,
                  abi: TILES_ABI,
                  functionName: 'hexes',
                  args: [h3ToUint64(h)],
                })
                .then((hex) => toTile(h, hex as HexTuple))
                .catch(() => null),
            ),
          ),
        ),
      );
      if (reqTokenRef.current !== myToken) return; // superseded
      wave.forEach((slice, wi) => {
        slice.forEach((h, idx) => cacheRef.current.set(h, results[wi][idx]));
      });
    }
    capCache();
    setTiles(new Map(cacheRef.current));
  }, []);

  useEffect(() => {
    fetchH3s(visibleHexes);
  }, [visibleHexes, fetchH3s]);

  const refresh = useCallback(
    async (h3s: string[]) => {
      h3s.forEach((h) => cacheRef.current.delete(h));
      await fetchH3s(h3s);
    },
    [fetchH3s],
  );

  useClaimDoneListener((detail) => {
    window.setTimeout(() => {
      void refresh(detail.h3s);
    }, 800);
  });

  return { tiles, refresh };
}
