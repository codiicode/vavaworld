'use client';

import { useCallback, useEffect, useState } from 'react';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getConnection } from './anchor-client';

/**
 * Reads the SOL balance for the given public key.
 *
 * Originally subscribed to live updates via `onAccountChange`. We removed that
 * because Helius RPC URLs include an `?api-key=…` query string, and the
 * web3.js Connection class rebuilds the WSS URL in a way that breaks against
 * that — every reconnect attempt fails with "Insufficient resources" and the
 * client tight-loops, swamping the browser.
 *
 * Instead we poll every 30s. Cheap, no socket storm. `refetch()` lets callers
 * force an immediate re-read (e.g. right after a successful claim).
 */
const POLL_MS = 30_000;

export function useWalletBalance(publicKey: PublicKey | null): {
  balance: number | null;
  loading: boolean;
  refetch: () => void;
} {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [reqId, setReqId] = useState(0);
  const refetch = useCallback(() => setReqId((x) => x + 1), []);

  useEffect(() => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    const connection: Connection = getConnection();
    let cancelled = false;

    const fetchOnce = async () => {
      if (!publicKey) return;
      try {
        const lamports = await connection.getBalance(publicKey);
        if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL);
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
  }, [publicKey, reqId]);

  return { balance, loading, refetch };
}
