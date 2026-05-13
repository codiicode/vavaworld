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
const programIdPk = new PublicKey(PROGRAM_ID);
const coder = new BorshAccountsCoder(idl as Idl);

function decodeTile(buf: Buffer, h3: string): ClaimedTile | null {
  try {
    // Field names match the IDL (snake_case). Anchor 1.0+ does NOT translate
    // these to camelCase on decode — we tried h3Id/claimedAt and got undefined.
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

export function useTiles(visibleHexes: string[]): {
  tiles: Cache;
  refresh: (h3s: string[]) => Promise<void>;
} {
  const [tiles, setTiles] = useState<Cache>(new Map());
  const cacheRef = useRef<Cache>(new Map());
  const connRef = useRef<Connection>(getConnection());

  const fetchH3s = useCallback(async (h3s: string[]) => {
    if (h3s.length === 0) return;
    const conn = connRef.current;

    const toFetch = h3s.filter((h) => !cacheRef.current.has(h));
    if (toFetch.length === 0) return;

    const pdas = toFetch.map((h) => ({ h, pda: tilePda(h, programIdPk)[0] }));

    for (let i = 0; i < pdas.length; i += BATCH) {
      const slice = pdas.slice(i, i + BATCH);
      const accs = await conn.getMultipleAccountsInfo(slice.map((s) => s.pda));
      slice.forEach((s, idx) => {
        const ai = accs[idx];
        if (!ai) {
          cacheRef.current.set(s.h, null);
        } else {
          cacheRef.current.set(s.h, decodeTile(ai.data as Buffer, s.h));
        }
      });
    }
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
