'use client';

import { Hexagon } from 'lucide-react';
import { Flag } from '@/components/flag';
import { CountUp } from '@/components/count-up';
import { recentClaims } from '@/lib/live-feed';

// Mock global figures - believable scale, count up on mount. Wire to the
// indexer's aggregate query when it ships.
const STATS = [
  { label: 'Hexes claimed', value: 1_284_920, fmt: (n: number) => Math.round(n).toLocaleString('en-US') },
  { label: 'Countries active', value: 19, fmt: (n: number) => String(Math.round(n)) },
  { label: 'Holders', value: 8_640, fmt: (n: number) => Math.round(n).toLocaleString('en-US') },
];

const FEED = recentClaims(14);

/**
 * Thin "world is alive" strip under the hero: live global counters + a scrolling
 * marquee of recent claims. Social proof + scale = the page feels like a real,
 * in-progress land grab the moment you land.
 */
export function LiveTicker() {
  return (
    <div className="relative z-[2] border-y border-white/10 bg-black/30 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-5 py-3 md:flex-row md:items-center md:gap-8 md:py-2.5">
        {/* Stats */}
        <div className="flex flex-none items-center gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col">
              <CountUp
                value={s.value}
                format={s.fmt}
                durationMs={1600}
                className="text-[15px] font-bold tabular-nums leading-none text-white"
              />
              <span className="mt-1 text-[9.5px] font-medium uppercase tracking-[0.14em] text-white/45">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Live marquee */}
        <div className="flex min-w-0 flex-1 items-center gap-3 border-white/10 md:border-l md:pl-8">
          <span className="flex flex-none items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/55">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Live
          </span>
          <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
            <div className="flex w-max animate-marquee items-center gap-7 motion-reduce:animate-none">
              {[...FEED, ...FEED].map((e, i) => (
                <span key={i} className="flex flex-none items-center gap-1.5 text-[12px] text-white/75">
                  <Hexagon size={11} strokeWidth={2} className="text-[var(--brand,#5eead4)]" />
                  <span className="font-semibold text-white/90">@{e.handle}</span>
                  <span className="text-white/45">claimed in</span>
                  <span>{e.city}</span>
                  <Flag code={e.country} size={12} />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
