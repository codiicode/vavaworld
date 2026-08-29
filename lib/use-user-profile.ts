'use client';

import { createContext, useContext } from 'react';
import { usePrivyUser } from './wallet-context';
import { useActiveWallet } from '@/lib/active-wallet';
import { useSupabaseProfile } from '@/lib/supabase-profile';

export type UserProfile = {
  /** Best human-readable name available - Supabase username > twitter handle > google name > … */
  displayName: string;
  /** The @-handle to display next to the name. Supabase value wins over Twitter. */
  username: string | null;
  /** Avatar source: Supabase upload > Twitter pic > null (gradient fallback in UI) */
  avatarUrl: string | null;
  /** User-chosen ISO 3166-1 alpha-2 country code (lowercase), or null */
  flagCountryCode: string | null;
  /** Short user bio (max 280 chars), or null */
  bio: string | null;
  /** Active wallet address (Solana base58), or null if not connected */
  walletAddress: string | null;
  /** Privy user creation date, when available */
  joinedAt: Date | null;
  /** Which login method the user came in via */
  provider: 'twitter' | 'google' | 'apple' | 'email' | 'wallet' | null;
  /** Whether the user has saved a Supabase profile row (i.e. visited the edit dialog) */
  hasCustomProfile: boolean;
};

function shortAddr(addr: string): string {
  if (!addr) return '-';
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

/**
 * Context lets pages/components pass a `version` bump so a save in the edit dialog
 * forces every consumer of `useUserProfile` to re-fetch its Supabase row. Default
 * version is 0 (a single shared cache key).
 */
export const ProfileVersionContext = createContext(0);
export const ProfileVersionProvider = ProfileVersionContext.Provider;

/**
 * Unified view of "who is this user".
 *
 * Resolution order for each field:
 *   1. Supabase `profiles` row (user-edited values)
 *   2. Privy linked-account metadata (Twitter pic + handle when linked)
 *   3. Wallet address fallback
 *
 * Used to feed the IdentityCard, AppSidebar wallet card, and anywhere else we
 * display the signed-in user.
 */
export function useUserProfile(): UserProfile {
  const { user, ready } = usePrivyUser();
  const wallet = useActiveWallet();
  const version = useContext(ProfileVersionContext);
  const { profile: db } = useSupabaseProfile(wallet.address, version);

  const walletAddress = wallet.address;

  // Pre-hydration / fully signed-out shell
  if (!ready || (!user && !walletAddress)) {
    return {
      displayName: walletAddress ? shortAddr(walletAddress) : '-',
      username: null,
      avatarUrl: null,
      flagCountryCode: null,
      bio: null,
      walletAddress,
      joinedAt: null,
      provider: walletAddress ? 'wallet' : null,
      hasCustomProfile: false,
    };
  }

  // Base values from Privy / wallet
  let displayName = walletAddress ? shortAddr(walletAddress) : '-';
  let username: string | null = null;
  let avatarUrl: string | null = null;
  let provider: UserProfile['provider'] = walletAddress ? 'wallet' : null;

  if (user?.twitter) {
    const tw = user.twitter;
    displayName = tw.name ?? (tw.username ? `@${tw.username}` : displayName);
    username = tw.username ?? null;
    avatarUrl = tw.profilePictureUrl ?? null;
    provider = 'twitter';
  } else if (user?.google) {
    displayName = user.google.name ?? user.google.email ?? displayName;
    provider = 'google';
  } else if (user?.apple) {
    displayName = user.apple.email?.split('@')[0] ?? displayName;
    provider = 'apple';
  } else if (user?.email) {
    displayName = user.email.address.split('@')[0];
    provider = 'email';
  }

  // Supabase overrides - every field is independent so the user can mix
  // (e.g. Twitter avatar but a custom display name).
  if (db?.username) {
    username = db.username;
    displayName = db.username;
  }
  if (db?.avatar_url) avatarUrl = db.avatar_url;

  return {
    displayName,
    username,
    avatarUrl,
    flagCountryCode: db?.flag_country_code ?? null,
    bio: db?.bio ?? null,
    walletAddress,
    joinedAt: user?.createdAt ?? null,
    provider,
    hasCustomProfile: !!db,
  };
}
