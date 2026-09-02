'use client';

import { useEffect, useState } from 'react';
import { getPublicClient, TILES_ABI, TILES_ADDRESS } from './evm';
import { VAVA_UNIT, tierFor, type TierKey } from './tokenomics-constants';

const cache = new Map<string, TierKey>();

/**
 * Staking tier (Tourist / Citizen / Baron / President) for ANY wallet -
 * reads the contract's stakes mapping so public profiles can show the
 * badge. No stake (or RPC hiccup) = Tourist.
 */
export function useStakedTier(address: string | null): TierKey {
  const [tier, setTier] = useState<TierKey>(
    address ? (cache.get(address) ?? 'tourist') : 'tourist',
  );

  useEffect(() => {
    if (!address || !TILES_ADDRESS) {
      setTier('tourist');
      return;
    }
    const cached = cache.get(address);
    if (cached) {
      setTier(cached);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const client = getPublicClient();
        const s = (await client.readContract({
          address: TILES_ADDRESS,
          abi: TILES_ABI,
          functionName: 'stakes',
          args: [address as `0x${string}`],
        })) as [bigint, bigint, bigint] | { amount: bigint };
        const amount = Array.isArray(s) ? s[0] : s.amount;
        const t = tierFor(Number(amount / BigInt(VAVA_UNIT)));
        cache.set(address, t);
        if (alive) setTier(t);
      } catch {
        if (alive) setTier('tourist');
      }
    })();
    return () => {
      alive = false;
    };
  }, [address]);

  return tier;
}
