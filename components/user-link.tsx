'use client';

import { useEffect, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { findUserByAddr } from '@/lib/mock-users';
import { XBadge } from '@/components/x-badge';
import {
  getCachedUsername,
  getCachedXHandle,
  queueAddress,
  subscribeUsernames,
} from '@/lib/username-store';

/**
 * Renders a clickable user reference.
 *   - With a username:  @vavaqueen   → /u/vavaqueen
 *   - Without a username: 4fWA…6b4X  → /u/<address>
 *
 * Callers that already have a username (e.g. leaderboard rows) pass it via
 * `username`. Otherwise the address is resolved against real Supabase
 * profiles (batched, cached), then mock users, then short-formed.
 */
export function UserLink({
  addr,
  username,
  className,
  mono = true,
}: {
  addr: string;
  username?: string;
  className?: string;
  /** Use mono only when falling back to the raw address. */
  mono?: boolean;
}) {
  // Live lookup of the real Supabase username (only when no username was
  // passed in). useSyncExternalStore re-renders this link when its address
  // resolves from the shared batched cache.
  const fromStore = useSyncExternalStore(
    subscribeUsernames,
    () => getCachedUsername(addr),
    () => undefined,
  );
  // Server-verified X handle (Privy OAuth) - drives the X badge. Always
  // queued so the badge shows even when a username was passed in.
  const xHandle = useSyncExternalStore(
    subscribeUsernames,
    () => getCachedXHandle(addr),
    () => undefined,
  );

  useEffect(() => {
    if (addr) queueAddress(addr);
  }, [addr]);

  const resolved =
    username ?? fromStore ?? findUserByAddr(addr)?.username ?? undefined;
  const isUsername = resolved != null;
  // No username → short-form the raw address so 44-char keys never blow out
  // table rows (e.g. the activity feed).
  const label = isUsername
    ? `@${resolved}`
    : addr.length > 12
    ? `${addr.slice(0, 4)}…${addr.slice(-4)}`
    : addr;

  const link = (
    <Link
      href={`/u/${encodeURIComponent(isUsername ? resolved! : addr)}`}
      className={cn(
        'transition-colors hover:text-foreground hover:underline underline-offset-2',
        isUsername
          ? 'text-sm font-medium text-foreground/80'
          : mono
          ? 'font-mono text-xs text-foreground/75'
          : 'text-xs text-foreground/75',
        xHandle ? undefined : className,
      )}
    >
      {label}
    </Link>
  );

  if (!xHandle) return link;
  // The badge is its own anchor (opens the X profile) - it must be a
  // sibling of the profile link, never nested inside it.
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {link}
      <XBadge handle={xHandle} size={10} />
    </span>
  );
}
