import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client (route handlers / server code).
 *
 * Uses the public anon key - that's sufficient because all writes go through
 * the `claim_hex` SECURITY DEFINER function (which validates internally) and
 * the tables are RLS public-read only. No service-role key is needed or used.
 */
let _client: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY)');
  }
  _client = createClient(url, key, {
    auth: { persistSession: false },
    // Next.js patches global fetch and caches it in route handlers, which
    // would serve stale rows (e.g. a hex read before it was claimed). Force
    // every Supabase request to bypass the data cache.
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) =>
        fetch(input, { ...init, cache: 'no-store' }),
    },
  });
  return _client;
}
