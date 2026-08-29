'use client';

import { useCallback, useEffect, useState } from 'react';
import bs58 from 'bs58';

export type DbBid = {
  id: string;
  h3_id: string;
  bidder: string;
  price_sol: number;
  status: 'active' | 'accepted' | 'declined' | 'cancelled' | 'superseded';
  created_at: string;
  closed_at: string | null;
};

/**
 * Place a bid on a claimed hex (listed or not). A signed intent, no
 * escrow - money only moves when the owner accepts and the bidder
 * settles through the verified buy flow.
 */
export async function placeBid(args: {
  h3: string;
  bidder: string;
  priceSol: number;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}): Promise<DbBid> {
  const message = `vava:bid:${args.h3}:${args.priceSol}:${args.bidder}:ts=${Date.now()}`;
  const sig = await args.signMessage(new TextEncoder().encode(message));
  const res = await fetch('/api/bids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      h3: args.h3,
      bidder: args.bidder,
      priceSol: args.priceSol,
      message,
      signature: bs58.encode(sig),
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Bid failed');
  return json.bid as DbBid;
}

/** Accept/decline (owner) or cancel (bidder) a bid - signed intent. */
export async function respondBid(args: {
  bidId: string;
  actor: string;
  action: 'accept' | 'decline' | 'cancel';
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}): Promise<DbBid> {
  const message = `vava:bid-${args.action}:${args.bidId}:${args.actor}:ts=${Date.now()}`;
  const sig = await args.signMessage(new TextEncoder().encode(message));
  const res = await fetch('/api/bids/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bidId: args.bidId,
      actor: args.actor,
      action: args.action,
      message,
      signature: bs58.encode(sig),
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `Bid ${args.action} failed`);
  return json.bid as DbBid;
}

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
