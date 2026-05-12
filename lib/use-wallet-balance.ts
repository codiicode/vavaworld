'use client';

import { useCallback, useEffect, useState } from 'react';
import { Connection, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getConnection } from './anchor-client';

/**
 * Reads the SOL balance for the given public key and subscribes to live updates
 * via `connection.onAccountChange`. Returns `null` when there's no key or while
 * the first fetch is in flight.
 *
 * Used by AppSidebar, SidebarWallet (map), IdentityCard (profile). Replaces the
 * three independent `getBalance` effects we had scattered before.
 */
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
    setLoading(true);
    (async () => {
      try {
        const lamports = await connection.getBalance(publicKey);
        if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL);
      } catch {
        if (!cancelled) setBalance(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Subscribe to balance changes — the websocket pushes a new lamports value
    // whenever the account is touched. Cheap, keeps the UI live across claims.
    let subId: number | null = null;
    try {
      subId = connection.onAccountChange(publicKey, (acc) => {
        if (cancelled) return;
        setBalance(acc.lamports / LAMPORTS_PER_SOL);
      });
    } catch {
      /* RPC doesn't support subscriptions — silent, balance won't auto-update */
    }

    return () => {
      cancelled = true;
      if (subId != null) {
        connection.removeAccountChangeListener(subId).catch(() => {});
      }
    };
  }, [publicKey, reqId]);

  return { balance, loading, refetch };
}
