'use client';

import { useCallback, useEffect, useState } from 'react';
import { getPublicClient, TILES_ABI, TILES_ADDRESS } from './evm';
import { useClaimDoneListener } from './claim-events';

export type Counters = { 1: bigint; 2: bigint; 3: bigint };

/** Sold-per-tier straight from the contract's tierCounts array. */
const POLL_MS = 30_000;

export function useCounters(): Counters {
  const [counters, setCounters] = useState<Counters>({ 1: 0n, 2: 0n, 3: 0n });

  const fetchAll = useCallback(async () => {
    if (!TILES_ADDRESS) return;
    const client = getPublicClient();
    try {
      const [a, b, c] = await Promise.all(
        [0n, 1n, 2n].map((i) =>
          client.readContract({
            address: TILES_ADDRESS,
            abi: TILES_ABI,
            functionName: 'tierCounts',
            args: [i],
          }),
        ),
      );
      setCounters({ 1: BigInt(a as bigint), 2: BigInt(b as bigint), 3: BigInt(c as bigint) });
    } catch {
      /* RPC hiccup - keep the previous values */
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const intervalId = window.setInterval(fetchAll, POLL_MS);
    return () => window.clearInterval(intervalId);
  }, [fetchAll]);

  useClaimDoneListener(() => {
    window.setTimeout(fetchAll, 800);
  });

  return counters;
}
