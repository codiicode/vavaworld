'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useActiveWallet } from '@/lib/active-wallet';

export type UserProfile = {
  /** Best human-readable name available: twitter handle > google name > email local-part > short wallet addr */
  displayName: string;
  /** Just the @handle when Twitter is linked, else null */
  username: string | null;
  /** Twitter profile picture URL, else null (gradient fallback in UI) */
  avatarUrl: string | null;
  /** Active wallet address (Solana base58), or null if not connected */
  walletAddress: string | null;
  /** Privy user creation date, when available */
  joinedAt: Date | null;
  /** Which login method the user came in via */
  provider: 'twitter' | 'google' | 'apple' | 'email' | 'wallet' | null;
};

function shortAddr(addr: string): string {
  if (!addr) return '—';
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

/**
 * Unified view of "who is this user" — pulls from Privy's linked-account metadata
 * (Twitter pic + username when linked) and falls back to wallet address.
 *
 * Designed to feed the identity card on /profile. Each field is independent so
 * the UI can render any subset (e.g. show avatar from Twitter even if the user
 * primarily logged in via a wallet).
 */
export function useUserProfile(): UserProfile {
  const { user, ready } = usePrivy();
  const wallet = useActiveWallet();

  const walletAddress = wallet.address;

  if (!ready || (!user && !walletAddress)) {
    return {
      displayName: walletAddress ? shortAddr(walletAddress) : '—',
      username: null,
      avatarUrl: null,
      walletAddress,
      joinedAt: null,
      provider: walletAddress ? 'wallet' : null,
    };
  }

  // Twitter takes priority for identity surface — it carries both handle + avatar.
  if (user?.twitter) {
    const tw = user.twitter;
    return {
      displayName: tw.name ?? (tw.username ? `@${tw.username}` : shortAddr(walletAddress ?? '')),
      username: tw.username ?? null,
      avatarUrl: tw.profilePictureUrl ?? null,
      walletAddress,
      joinedAt: user.createdAt ?? null,
      provider: 'twitter',
    };
  }
  if (user?.google) {
    return {
      displayName: user.google.name ?? user.google.email ?? shortAddr(walletAddress ?? ''),
      username: null,
      avatarUrl: null,
      walletAddress,
      joinedAt: user.createdAt ?? null,
      provider: 'google',
    };
  }
  if (user?.apple) {
    return {
      displayName: user.apple.email?.split('@')[0] ?? shortAddr(walletAddress ?? ''),
      username: null,
      avatarUrl: null,
      walletAddress,
      joinedAt: user.createdAt ?? null,
      provider: 'apple',
    };
  }
  if (user?.email) {
    return {
      displayName: user.email.address.split('@')[0],
      username: null,
      avatarUrl: null,
      walletAddress,
      joinedAt: user.createdAt ?? null,
      provider: 'email',
    };
  }

  return {
    displayName: walletAddress ? shortAddr(walletAddress) : '—',
    username: null,
    avatarUrl: null,
    walletAddress,
    joinedAt: user?.createdAt ?? null,
    provider: 'wallet',
  };
}
