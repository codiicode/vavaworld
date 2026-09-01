'use client';

import { Hexagon } from 'lucide-react';
import { Flag } from '@/components/flag';
import { useLiveClaims } from '@/lib/live-feed';

/**
 * Floating "world is alive" feed on the map: incoming claims pop in bottom-left,
 * lifted above the floating nav dock on desktop
 * so the map reads as a live, multiplayer land grab rather than a static view.
 * Mock-driven today (see lib/live-feed); becomes real with the indexer.
 */
export function LiveClaimsFeed() {
  const events = useLiveClaims(5000, 3, 3);

  return (
    <div className="pointer-events-none absolute bottom-7 left-4 z-[6] hidden flex-col gap-1.5 md:bottom-[108px] md:flex md:left-[18px]">
      <div className="mb-0.5 flex items-center gap-1.5 pl-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7db4f5] opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#7db4f5]" />
        </span>
        Live claims
      </div>
      {events.map((e, i) => (
        <div
          key={e.id}
          className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-white animate-in fade-in slide-in-from-left-3 duration-300"
          style={{ opacity: 1 - i * 0.22 }}
        >
          <Hexagon size={12} strokeWidth={2} className="flex-none text-[var(--brand)]" />
          <span className="text-[12px]">
            <span className="font-semibold">@{e.handle}</span>
            <span className="text-white/70"> claimed in </span>
            <span className="font-medium">{e.city}</span>
          </span>
          <Flag code={e.country} size={13} className="flex-none" />
        </div>
      ))}
    </div>
  );
}
