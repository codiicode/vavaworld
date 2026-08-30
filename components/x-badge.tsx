'use client';

import { cn } from '@/lib/utils';

/**
 * Verified-X marker shown next to a user's name. Only rendered for
 * accounts whose X (Twitter) link has been verified server-side via
 * Privy OAuth - it cannot be obtained by typing a lookalike username.
 */
export function XBadge({
  handle,
  size = 12,
  className,
}: {
  /** The verified X handle - shown in the tooltip. */
  handle: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      title={`Verified X: @${handle}`}
      aria-label={`Verified X account @${handle}`}
      className={cn(
        'inline-flex flex-none items-center justify-center rounded-full bg-foreground/90 text-background',
        className,
      )}
      style={{ width: size + 6, height: size + 6 }}
    >
      <svg viewBox="0 0 24 24" width={size - 2} height={size - 2} fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </span>
  );
}
