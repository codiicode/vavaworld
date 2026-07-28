import Link from 'next/link';
import { cn } from '@/lib/utils';
import { findUserByAddr } from '@/lib/mock-users';

/**
 * Renders a clickable user reference.
 *   - With a username:  @vavaqueen   → /u/vavaqueen
 *   - Without a username: 0xA4B2…82F1 → /u/0xA4B2…82F1
 *
 * Callers that already have a username (e.g. leaderboard rows) pass it via
 * `username`. Callers that only have an address let the helper look it up
 * in MOCK_USERS so we stay consistent everywhere.
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
  const resolved = username ?? findUserByAddr(addr)?.username;
  const handle = resolved ?? addr;
  const isUsername = resolved != null;

  return (
    <Link
      href={`/u/${encodeURIComponent(isUsername ? resolved! : addr)}`}
      className={cn(
        'transition-colors hover:text-foreground hover:underline underline-offset-2',
        isUsername
          ? 'text-sm font-medium text-foreground/80'
          : mono
          ? 'font-mono text-xs text-foreground/75'
          : 'text-xs text-foreground/75',
        className,
      )}
    >
      {isUsername ? `@${handle}` : handle}
    </Link>
  );
}
