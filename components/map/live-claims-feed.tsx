'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Hexagon } from 'lucide-react';
import { Flag } from '@/components/flag';
import { useHexLocations } from '@/lib/use-hex-locations';
import { useClaimDoneListener } from '@/lib/claim-events';

/**
 * Floating "world is alive" feed on the map: the newest REAL claims and
 * sales from /api/activity, each row linking to the hex's property card.
 * Renders nothing while the world is empty - an invented crowd would lie.
 */
type FeedEvent = {
  type: 'claim' | 'sale';
  h3Id: string;
  to: string;
  toUsername: string | null;
  countryIso: string;
  countryName: string;
  count: number;
  at: string;
};

const POLL_MS = 20_000;
const SHOW = 3;

const short = (a: string) => (a.length > 12 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a);

export function LiveClaimsFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);

  const load = useCallback(() => {
    fetch('/api/activity', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.events) setEvents((j.events as FeedEvent[]).slice(0, SHOW));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const t = window.setInterval(() => {
      if (!document.hidden) load();
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [load]);

  // A claim made from this very map shows up right away.
  useClaimDoneListener(() => {
    window.setTimeout(load, 1500);
  });

  const hexSet = useMemo(() => new Set(events.map((e) => e.h3Id)), [events]);
  const locations = useHexLocations(hexSet);

  if (events.length === 0) return null;

  return (
    <div className="pointer-events-none absolute bottom-7 left-4 z-[6] hidden flex-col gap-1.5 md:bottom-[108px] md:flex md:left-[18px]">
      <div className="mb-0.5 flex items-center gap-1.5 pl-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7db4f5] opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#7db4f5]" />
        </span>
        Live claims
      </div>
      {events.map((e, i) => {
        const loc = locations.get(e.h3Id);
        const where = loc?.place ?? loc?.neighborhood ?? e.countryName;
        const who = e.toUsername ? `@${e.toUsername}` : short(e.to);
        return (
          <Link
            key={`${e.h3Id}-${e.at}`}
            href={`/h/${encodeURIComponent(e.h3Id)}`}
            className="glass pointer-events-auto flex items-center gap-2 rounded-full px-3 py-1.5 text-white transition-colors animate-in fade-in slide-in-from-left-3 duration-300 hover:bg-white/15"
            style={{ opacity: 1 - i * 0.22 }}
          >
            <Hexagon size={12} strokeWidth={2} className="flex-none text-[var(--brand)]" />
            <span className="text-[12px]">
              <span className="font-semibold">{who}</span>
              <span className="text-white/70">
                {e.type === 'sale'
                  ? ' bought in '
                  : e.count > 1
                    ? ` claimed ${e.count.toLocaleString('en-US')} hexes in `
                    : ' claimed in '}
              </span>
              <span className="font-medium">{where}</span>
            </span>
            <Flag code={e.countryIso} size={13} className="flex-none" />
          </Link>
        );
      })}
    </div>
  );
}
