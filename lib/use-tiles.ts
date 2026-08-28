'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { BorshAccountsCoder, type Idl } from '@coral-xyz/anchor';
import idl from './anchor-idl.json';
import { tilePda } from './tile-pda';
import { getConnection, PROGRAM_ID } from './anchor-client';
import { useClaimDoneListener } from './claim-events';
import type { ClaimedTile } from '@/types/tile';
import type { Tier } from './tier';

const BATCH = 100;
// Fire several getMultipleAccountsInfo batches at once instead of serially -
// a settled z16 viewport is ~2k cells (20 batches), and 20 sequential RPC
// round-trips is seconds of "tiles colouring in late". Bounded so we don't
// trip provider rate limits (429) on a fast pan.
const CONCURRENCY = 8;
const programIdPk = new PublicKey(PROGRAM_ID);
const coder = new BorshAccountsCoder(idl as Idl);

function decodeTile(buf: Buffer, h3: string): ClaimedTile | null {
  try {
    // Field names match the IDL (snake_case). Anchor 1.0+ does NOT translate
    // these to camelCase on decode - we tried h3Id/claimedAt and got undefined.
    const decoded = coder.decode<{
      owner: PublicKey;
      h3_id: { toString: () => string };
      claimed_at: { toNumber: () => number };
      tier: number;
      price_paid: { toString: () => string };
      bump: number;
    }>('Tile', buf);
    return {
      h3,
      owner: decoded.owner.toBase58(),
      tier: decoded.tier as Tier,
      claimedAt: decoded.claimed_at.toNumber(),
      pricePaid: BigInt(decoded.price_paid.toString()),
      bump: decoded.bump,
    };
  } catch {
    return null;
  }
}

/** Cache: h3 → ClaimedTile (when account exists) | null (fetched but doesn't exist) | undefined (not yet fetched) */
type Cache = Map<string, ClaimedTile | null>;

// Module-level so the map's claimed-tile cache SURVIVES navigation. The
// hook's ref used to be per-mount, so leaving /map and returning re-fetched
// every visible cell (thousands of RPC lookups) from scratch. Persisting it
// makes re-entering the map paint instantly for already-seen cells.
// Soft-capped so a session panning the whole world can't grow it unbounded.
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

export function useTiles(visibleHexes: string[]): {
  tiles: Cache;
  refresh: (h3s: string[]) => Promise<void>;
} {
  // Seed initial render from whatever the module cache already holds so a
  // return visit shows claimed tiles with zero RPC.
  const [tiles, setTiles] = useState<Cache>(() => new Map(GLOBAL_TILE_CACHE));
  const cacheRef = useRef<Cache>(GLOBAL_TILE_CACHE);
  const connRef = useRef<Connection>(getConnection());
  // Monotonic token: panning fast queues several fetches against devnet. Only
  // the newest may commit results - older awaits bail after each RPC batch so
  // a slow stale response can't overwrite the current viewport's tiles.
  const reqTokenRef = useRef(0);

  const fetchH3s = useCallback(async (h3s: string[]) => {
    if (h3s.length === 0) return;
    const conn = connRef.current;

    const toFetch = h3s.filter((h) => !cacheRef.current.has(h));
    if (toFetch.length === 0) return;

    const myToken = ++reqTokenRef.current;
    const pdas = toFetch.map((h) => ({ h, pda: tilePda(h, programIdPk)[0] }));

    const batches: { h: string; pda: PublicKey }[][] = [];
    for (let i = 0; i < pdas.length; i += BATCH) batches.push(pdas.slice(i, i + BATCH));

    // Process in waves of CONCURRENCY parallel batches; bail between waves if a
    // newer viewport fetch has superseded this one.
    for (let i = 0; i < batches.length; i += CONCURRENCY) {
      const wave = batches.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        wave.map((slice) => conn.getMultipleAccountsInfo(slice.map((s) => s.pda))),
      );
      if (reqTokenRef.current !== myToken) return; // superseded by a newer fetch
      wave.forEach((slice, wi) => {
        const accs = results[wi];
        slice.forEach((s, idx) => {
          const ai = accs[idx];
          cacheRef.current.set(s.h, ai ? decodeTile(ai.data as Buffer, s.h) : null);
        });
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

  // Belt-and-suspenders: if a claim fires while this hook is mounted, refetch
  // the affected hexes after a short delay (RPC indexing lag on devnet).
  useClaimDoneListener((detail) => {
    window.setTimeout(() => {
      void refresh(detail.h3s);
    }, 800);
  });

  return { tiles, refresh };
}
