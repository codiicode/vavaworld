'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BorshAccountsCoder, type Idl } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { useActiveWallet } from './active-wallet';
import { getConnection, PROGRAM_ID } from './anchor-client';
import idl from './anchor-idl.json';
import { useClaimDoneListener } from './claim-events';
import type { ClaimedTile } from '@/types/tile';

const coder = new BorshAccountsCoder(idl as Idl);

type DecodedTile = {
  owner: PublicKey;
  h3Id: { toString: (radix?: number) => string };
  claimedAt: { toNumber: () => number };
  tier: number;
  pricePaid: { toString: () => string };
  bump: number;
};

/**
 * Fetches every Tile PDA owned by the active wallet. Uses `getProgramAccounts`
 * with a memcmp filter at offset 8 (owner pubkey) on the 66-byte Tile layout.
 *
 * Single source of truth for "what tiles does this user own" — consumed by
 * IdentityCard (count, total spent), TilesTab (table/grid). The previous
 * MyTilesList logic was duplicated; this hook replaces it.
 */
export function useUserTiles(): {
  tiles: ClaimedTile[] | null;
  loading: boolean;
  refetch: () => void;
} {
  const { publicKey, connected } = useActiveWallet();
  const [tiles, setTiles] = useState<ClaimedTile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);
  const [version, setVersion] = useState(0);
  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  // Stringify before using as a useEffect dep — `useActiveWallet` rebuilds the
  // PublicKey object every render, which would tear down + remount the effect
  // each render and storm getProgramAccounts (same bug as in use-wallet-balance).
  const addressKey = publicKey?.toBase58() ?? null;

  useEffect(() => {
    if (!connected || !addressKey) {
      setTiles(null);
      return;
    }
    const id = ++reqIdRef.current;
    setLoading(true);
    (async () => {
      try {
        const conn = getConnection();
        const accs = await conn.getProgramAccounts(new PublicKey(PROGRAM_ID), {
          filters: [
            { dataSize: 66 },
            { memcmp: { offset: 8, bytes: addressKey } },
          ],
        });
        if (id !== reqIdRef.current) return;
        const out: ClaimedTile[] = [];
        for (const acc of accs) {
          try {
            const decoded = coder.decode<DecodedTile>('Tile', acc.account.data);
            out.push({
              h3: decoded.h3Id.toString(16).padStart(15, '0'),
              owner: decoded.owner.toBase58(),
              tier: decoded.tier as 1 | 2 | 3,
              claimedAt: decoded.claimedAt.toNumber(),
              pricePaid: BigInt(decoded.pricePaid.toString()),
              bump: decoded.bump,
            });
          } catch {
            /* skip undecodable */
          }
        }
        out.sort((a, b) => b.claimedAt - a.claimedAt);
        setTiles(out);
      } finally {
        if (id === reqIdRef.current) setLoading(false);
      }
    })();
  }, [connected, addressKey, version]);

  // Devnet getProgramAccounts can lag a few hundred ms behind the tx the user
  // just confirmed. Defer the refetch one tick so we don't re-query before the
  // RPC has indexed the new Tile PDAs.
  useClaimDoneListener(() => {
    window.setTimeout(refetch, 800);
  });

  return { tiles, loading, refetch };
}
