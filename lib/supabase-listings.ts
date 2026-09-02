'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from './supabase';

/** Row shape returned by `public.listings`. */
export type DbListing = {
  id: string;
  h3_id: string;
  seller: string;
  price_sol: number;
  status: 'active' | 'sold' | 'cancelled';
  listed_at: string;
  closed_at: string | null;
  buyer: string | null;
  /** Set when the listing came from an accepted bid - only this address can buy. */
  reserved_for: string | null;
};

/**
 * Subscribe to all active marketplace listings, newest first.
 * `version` lets callers force a refetch after a write (cheap because the
 * table is small while we're pre-launch).
 */
export function useActiveListings(version = 0) {
  const [data, setData] = useState<DbListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;

    let cancelled = false;
    setLoading(true);
    (async () => {
      // Reserved listings (accepted bids) are private to their bidder -
      // they never show on the public marketplace.
      const { data, error } = await sb
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .is('reserved_for', null)
        .order('listed_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setData([]);
      } else {
        setError(null);
        setData((data ?? []) as DbListing[]);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [version]);

  return { listings: data, loading, error };
}

/** Fetch a single listing by id (active or not). Used by the detail page. */
export async function fetchListing(id: string): Promise<DbListing | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('listings')
    .select('*')
    .eq('id', id)
    .maybeSingle<DbListing>();
  if (error) return null;
  return data ?? null;
}

/**
 * Create a listing through the API. Requires the seller's wallet to
 * sign an intent message - direct table writes are closed (ownership
 * enforced atomically in SQL, signature proves the seller asked).
 */
/**
 * Mirror an on-chain listing into the marketplace index. No signature:
 * the server proves intent by reading the contract (seller owns the hex
 * and the ask is set), so listing costs the seller exactly one wallet
 * prompt - the list() transaction itself.
 */
export async function createListing(args: {
  h3: string;
  seller: string;
  priceSol: number;
}): Promise<DbListing> {
  const res = await fetch('/api/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      h3: args.h3,
      seller: args.seller,
      priceSol: args.priceSol,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'List failed');
  return json.listing as DbListing;
}

/** Close a listing row after the on-chain delist - verified against the contract, no signature. */
export async function cancelListing(args: {
  id: string;
  seller: string;
}): Promise<void> {
  const res = await fetch('/api/delist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      listingId: args.id,
      seller: args.seller,
    }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({} as { error?: string }));
    throw new Error(json.error ?? 'Delist failed');
  }
}

/**
 * Tiny pub-sub for "I just changed listings, please refetch". The marketplace
 * page subscribes; the list dialog dispatches after a successful insert.
 */
const LISTING_CHANGED = 'vava:listings-changed';
export function dispatchListingsChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(LISTING_CHANGED));
}
export function useListingsVersion(): number {
  const [v, setV] = useState(0);
  const bump = useCallback(() => setV((x) => x + 1), []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener(LISTING_CHANGED, bump);
    return () => window.removeEventListener(LISTING_CHANGED, bump);
  }, [bump]);
  return v;
}
