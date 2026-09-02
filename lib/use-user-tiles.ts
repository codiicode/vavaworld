'use client';

import { useCallback, useMemo, useState } from 'react';
import { hexCenter } from './h3-utils';
import { classifyTier } from './tier';
import { useActiveWallet } from './active-wallet';
import { refreshClaimedRegistry, useClaimedRegistry } from './use-claimed-registry';
import type { ClaimedTile } from '@/types/tile';

/**
 * Every hex owned by the active wallet, from the claimed registry (the
 * Supabase mirror of on-chain Claimed events). The EVM contract has no
 * enumerable owner index, and the registry is already the map's source
 * of truth for ownership + paid price - so this is both cheaper and
 * consistent with what the rest of the UI shows.
 */
export function useUserTiles(): {
  tiles: ClaimedTile[] | null;
  loading: boolean;
  refetch: () => void;
} {
  const { address, connected } = useActiveWallet();
  const registry = useClaimedRegistry();
  const [, setVersion] = useState(0);

  const refetch = useCallback(() => {
    refreshClaimedRegistry();
    setVersion((v) => v + 1);
  }, []);

  const tiles = useMemo<ClaimedTile[] | null>(() => {
    if (!connected || !address) return null;
    const mine: ClaimedTile[] = [];
    const me = address.toLowerCase();
    for (const [h3, info] of registry) {
      if (info.owner.toLowerCase() !== me) continue;
      const c = hexCenter(h3);
      mine.push({
        h3,
        owner: info.owner,
        tier: classifyTier(c.lat, c.lng),
        claimedAt: Math.floor(info.claimedAt / 1000),
        paidUsd: info.priceUsd,
        tx: info.tx,
      });
    }
    mine.sort((a, b) => b.claimedAt - a.claimedAt);
    return mine;
  }, [connected, address, registry]);

  return { tiles, loading: connected && tiles === null, refetch };
}
