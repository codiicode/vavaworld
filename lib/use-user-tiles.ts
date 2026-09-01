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

/** Anchor 1.0+ keeps snake_case from the IDL in the decoded object - we tried
 *  camelCase first and got `undefined` on every field. */
type DecodedTile = {
  owner: PublicKey;
  h3_id: { toString: (radix?: number) => string };
  claimed_at: { toNumber: () => number };
  tier: number;
  price_paid: { toString: () => string };
  bump: number;
};

/**
 * Fetches every Tile PDA owned by the active wallet. Uses `getProgramAccounts`
 * with a memcmp filter at offset 8 (owner pubkey) on the 66-byte Tile layout.
 *
 * Single source of truth for "what tiles does this user own" - consumed by
 * IdentityCard (count, total spent), TilesTab (table/grid). The previous
 * MyTilesList logic was duplicated; this hook replaces it.
 */
export function useUserTiles(): {
  tiles: ClaimedTile[] | null;
  loading: boolean;
  refetch: () => void;
} {
  const { address, connected } = useActiveWallet();
  const [tiles, setTiles] = useState<ClaimedTile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);
  const [version, setVersion] = useState(0);
  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  // Stringify before using as a useEffect dep - `useActiveWallet` rebuilds the
  // PublicKey object every render, which would tear down + remount the effect
  // each render and storm getProgramAccounts (same bug as in use-wallet-balance).
  const addressKey = address ?? null;

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
              h3: decoded.h3_id.toString(16).padStart(15, '0'),
              owner: decoded.owner.toBase58(),
              tier: decoded.tier as 1 | 2 | 3,
              claimedAt: decoded.claimed_at.toNumber(),
              pricePaid: BigInt(decoded.price_paid.toString()),
              bump: decoded.bump,
            });
          } catch (e) {
            console.warn('[useUserTiles] decode failed for', acc.pubkey.toBase58(), e);
          }
        }
        out.sort((a, b) => b.claimedAt - a.claimedAt);
        setTiles(out);
      } catch (e) {
        console.error('[useUserTiles] query threw:', e);
        if (id === reqIdRef.current) setTiles([]);
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
