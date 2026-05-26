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

/** Insert a new active listing. Throws on conflict (already-listed hex). */
export async function createListing(args: {
  h3: string;
  seller: string;
  priceSol: number;
}): Promise<DbListing> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');
  const { data, error } = await sb
    .from('listings')
    .insert({
      h3_id: args.h3,
      seller: args.seller,
      price_sol: args.priceSol,
      status: 'active',
    })
    .select()
    .single<DbListing>();
  if (error) {
    if (error.code === '23505') throw new Error('This hex is already listed');
    if (error.code === '23514') throw new Error('Invalid price');
    if (error.code === '23503') throw new Error('Hex not found in our records');
    throw new Error(error.message);
  }
  return data;
}

/** Cancel an active listing — sets status to cancelled. */
export async function cancelListing(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');
  const { error } = await sb
    .from('listings')
    .update({ status: 'cancelled', closed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'active');
  if (error) throw new Error(error.message);
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
