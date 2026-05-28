'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

/**
 * Lazy singleton - avoids constructing the client at module-load (which breaks SSR
 * paths that don't have the env vars wired up yet, and adds noise to bundles that
 * never actually call Supabase).
 *
 * Returns null when env vars are missing so callers can degrade gracefully.
 */
export function getSupabase(): SupabaseClient | null {
  if (!url || !key) return null;
  if (_client) return _client;
  _client = createClient(url, key, {
    auth: { persistSession: false },  // we use Privy for auth; Supabase is just a data store
  });
  return _client;
}

export type DbProfile = {
  wallet_address: string;
  username: string | null;
  flag_country_code: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
};
