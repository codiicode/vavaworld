'use client';

import { useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import type { MockUser } from '@/lib/mock-users';

/**
 * Share controls on a public profile - the viral loop. "Share" opens an X
 * compose intent pre-filled with the player's stats + their /u link; "Copy"
 * grabs the URL. The page's auto-generated opengraph-image renders the card.
 */
export function ShareProfile({ user }: { user: MockUser }) {
  const [copied, setCopied] = useState(false);
  const name = user.username ? `@${user.username}` : user.addr;

  const url = () =>
    typeof window !== 'undefined' ? window.location.href : 'https://vavaworld.fun';

  const text =
    `${name} owns ${user.hexes.toLocaleString()} hexes across ${user.countries} ` +
    `countries on vavaworld 🌍${user.presidentOf?.length ? ` · President of ${user.presidentOf.map((c) => c.toUpperCase()).join(', ')}` : ''}`;

  const shareX = () => {
    const u = new URL('https://twitter.com/intent/tweet');
    u.searchParams.set('text', text);
    u.searchParams.set('url', url());
    window.open(u.toString(), '_blank', 'noopener,noreferrer');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked - no-op */
    }
  };

  return (
    <div className="flex flex-none items-center gap-2">
      <button
        type="button"
        onClick={shareX}
        className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-[13px] font-semibold text-background transition-opacity hover:opacity-90"
      >
        <Share2 size={14} strokeWidth={2} />
        Share
      </button>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy profile link"
        title="Copy profile link"
        className="flex items-center gap-1.5 rounded-full border border-white/45 bg-white/40 px-3 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-white/55"
      >
        {copied ? <Check size={14} className="text-emerald-600" /> : <Link2 size={14} />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
