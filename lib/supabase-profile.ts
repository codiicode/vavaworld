'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabase, type DbProfile } from './supabase';

export type ProfileUpdate = {
  username?: string | null;
  flagCountryCode?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
};

/**
 * Reads the row in `public.profiles` keyed by wallet address.
 * Returns null while loading, and after load if no row exists (first-time user).
 *
 * `version` exists so callers can force a re-fetch after an edit without remounting.
 */
export function useSupabaseProfile(walletAddress: string | null, version = 0) {
  const [data, setData] = useState<DbProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setData(null);
      return;
    }
    const sb = getSupabase();
    if (!sb) return;

    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('wallet_address', walletAddress)
        .maybeSingle<DbProfile>();
      if (cancelled) return;
      if (error) {
        // Common case: no row yet - `maybeSingle` returns null without error.
        // Any other error we just swallow into "no profile" for now.
        setData(null);
      } else {
        setData(data ?? null);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [walletAddress, version]);

  return { profile: data, loading };
}

/**
 * Upsert profile row by wallet address. Returns the new row on success or
 * throws with a user-readable message.
 *
 * Username uniqueness is enforced by a case-insensitive unique index - we
 * surface that as a friendly "Username is taken" message.
 */
export async function upsertProfile(
  walletAddress: string,
  update: ProfileUpdate,
): Promise<DbProfile> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');

  const row: Partial<DbProfile> = { wallet_address: walletAddress };
  if (update.username !== undefined) row.username = update.username;
  if (update.flagCountryCode !== undefined) row.flag_country_code = update.flagCountryCode;
  if (update.avatarUrl !== undefined) row.avatar_url = update.avatarUrl;
  if (update.bio !== undefined) row.bio = update.bio;

  const { data, error } = await sb
    .from('profiles')
    .upsert(row, { onConflict: 'wallet_address' })
    .select()
    .single<DbProfile>();

  if (error) {
    if (error.code === '23505') throw new Error('Username is already taken');
    if (error.code === '23514') throw new Error('Invalid input - check username and bio length');
    throw new Error(error.message);
  }
  return data;
}

/**
 * Upload an avatar file to the `avatars` bucket. Files are scoped under the
 * wallet address so collisions are impossible across users.
 *
 * Returns the publicly accessible URL.
 */
export async function uploadAvatar(walletAddress: string, file: File): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase not configured');

  const ext = (file.name.split('.').pop() ?? 'png').toLowerCase();
  const path = `${walletAddress}/${Date.now()}.${ext}`;

  const { error: upErr } = await sb.storage
    .from('avatars')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });
  if (upErr) throw new Error(upErr.message);

  const { data } = sb.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

/** Returns a stable bump that callers can pass as `version` to refetch. */
export function useProfileVersion() {
  const [v, setV] = useState(0);
  const bump = useCallback(() => setV((x) => x + 1), []);
  return [v, bump] as const;
}
