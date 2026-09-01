'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatEther } from 'viem';
import { getPublicClient } from './evm';
import { useClaimDoneListener } from './claim-events';

/**
 * Reads the ETH balance for the given address. Polls slowly and refreshes
 * right after a local claim confirms.
 */
const POLL_MS = 30_000;

export function useWalletBalance(address: string | null): {
  balance: number | null;
  loading: boolean;
  refetch: () => void;
} {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [reqId, setReqId] = useState(0);
  const refetch = useCallback(() => setReqId((x) => x + 1), []);

  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }
    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const wei = await getPublicClient().getBalance({ address: address as `0x${string}` });
        if (!cancelled) setBalance(Number(formatEther(wei)));
      } catch {
        if (!cancelled) setBalance(null);
      }
    };

    setLoading(true);
    fetchOnce().finally(() => {
      if (!cancelled) setLoading(false);
    });

    const intervalId = window.setInterval(fetchOnce, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [address, reqId]);

  useClaimDoneListener(() => {
    window.setTimeout(refetch, 800);
  });

  return { balance, loading, refetch };
}
