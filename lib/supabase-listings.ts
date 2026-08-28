'use client';

import { useCallback, useEffect, useState } from 'react';
import bs58 from 'bs58';
import { getSupabase } from './supabase';

const bs58encode = (bytes: Uint8Array) => bs58.encode(bytes);

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
      const { data, error } = await sb
        .from('listings')
        .select('*')
        .eq('status', 'active')
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
export async function createListing(args: {
  h3: string;
  seller: string;
  priceSol: number;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}): Promise<DbListing> {
  const message = `vava:list:${args.h3}:${args.priceSol}:${args.seller}:ts=${Date.now()}`;
  const sig = await args.signMessage(new TextEncoder().encode(message));
  const res = await fetch('/api/list', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      h3: args.h3,
      seller: args.seller,
      priceSol: args.priceSol,
      message,
      signature: bs58encode(sig),
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'List failed');
  return json.listing as DbListing;
}

/** Cancel an active listing through the API (signed intent). */
export async function cancelListing(args: {
  id: string;
  seller: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
}): Promise<void> {
  const message = `vava:delist:${args.id}:${args.seller}:ts=${Date.now()}`;
  const sig = await args.signMessage(new TextEncoder().encode(message));
  const res = await fetch('/api/delist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      listingId: args.id,
      seller: args.seller,
      message,
      signature: bs58encode(sig),
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
