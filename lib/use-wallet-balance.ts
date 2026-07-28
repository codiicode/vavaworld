'use client';

import { useCallback, useEffect, useState } from 'react';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getConnection } from './anchor-client';
import { useClaimDoneListener } from './claim-events';

/**
 * Reads the SOL balance for the given public key.
 *
 * IMPORTANT: depends on the stringified base58 address, NOT the PublicKey
 * object itself. `useActiveWallet` rebuilds a fresh PublicKey instance every
 * render - using it as a useEffect dep tore the effect down and remounted it
 * on every render, which fired thousands of getBalance requests per second
 * and got us 429-rate-limited.
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

  const addressKey = publicKey?.toBase58() ?? null;

  useEffect(() => {
    if (!addressKey) {
      setBalance(null);
      return;
    }
    const connection: Connection = getConnection();
    const pk = new PublicKey(addressKey);
    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const lamports = await connection.getBalance(pk);
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
  }, [addressKey, reqId]);

  useClaimDoneListener(() => {
    window.setTimeout(refetch, 800);
  });

  return { balance, loading, refetch };
}
