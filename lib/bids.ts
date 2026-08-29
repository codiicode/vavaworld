'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Database mirror of the on-chain bid escrows. All actions (place,
 * cancel, decline, accept) settle on-chain first - see lib/bid-chain.ts
 * - and are then mirrored here for querying + notifications.
 */
export type DbBid = {
  id: string;
  h3_id: string;
  bidder: string;
  price_sol: number;
  status: 'active' | 'accepted' | 'declined' | 'cancelled' | 'superseded';
  created_at: string;
  closed_at: string | null;
};

/** Active bids on one hex, highest first. `refresh()` refetches after a write. */
export function useBidsForHex(h3: string | null) {
  const [bids, setBids] = useState<DbBid[]>([]);
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    if (!h3) {
      setBids([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/bids?h3=${encodeURIComponent(h3)}`)
      .then((r) => (r.ok ? r.json() : { bids: [] }))
      .then((j) => {
        if (!cancelled) setBids((j.bids ?? []) as DbBid[]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [h3, version]);

  return { bids, refresh };
}
