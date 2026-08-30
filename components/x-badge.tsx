'use client';

import { cn } from '@/lib/utils';

/**
 * Verified-X marker shown next to a user's name. Only rendered for
 * accounts whose X (Twitter) link has been verified server-side via
 * Privy OAuth - it cannot be obtained by typing a lookalike username.
 * Links to the verified X profile in a new tab. Rendered as its own
 * anchor, so keep it a SIBLING of any surrounding link - never nest it
 * inside one.
 */
export function XBadge({
  handle,
  size = 12,
  className,
}: {
  /** The verified X handle - links to x.com/<handle>. */
  handle: string;
  size?: number;
  className?: string;
}) {
  return (
    <a
      href={`https://x.com/${encodeURIComponent(handle)}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`Verified X: @${handle} - open profile`}
      aria-label={`Open verified X profile @${handle}`}
      className={cn(
        'inline-flex flex-none items-center justify-center rounded-full bg-foreground/90 text-background transition-transform hover:scale-110',
        className,
      )}
      style={{ width: size + 6, height: size + 6 }}
    >
      <svg viewBox="0 0 24 24" width={size - 2} height={size - 2} fill="currentColor" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </a>
  );
}
