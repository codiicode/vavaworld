'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { flagEmoji } from '@/lib/flag-emoji';
import { mockActivity } from '@/lib/mock-marketplace';

/**
 * 300px right rail. Live sales feed with a pulsing "Live" indicator.
 *
 * Hidden below 1280px viewport (handled by the parent layout) — collectors
 * with smaller screens fall back to the dedicated /marketplace/activity page.
 */
export function ActivitySidebar() {
  return (
    <aside className="flex h-full w-[300px] flex-shrink-0 flex-col overflow-y-auto border-l border-white/30 bg-white/30 text-foreground backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/30 px-5 py-4">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/55">
            Live Activity
          </div>
          <div className="mt-0.5 text-sm font-semibold tracking-tight">Recent Sales</div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[11px] text-foreground/55">Live</span>
        </div>
      </div>

      {/* Feed */}
      <div className="flex flex-col">
        {mockActivity.slice(0, 20).map((a) => (
          <Link
            key={a.id}
            href={`/marketplace/${a.id}`}
            className="block cursor-pointer border-b border-foreground/[0.06] px-4 py-3 transition-colors hover:bg-foreground/[0.04]"
          >
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm leading-none">{flagEmoji(a.countryCode)}</span>
                <span className="text-sm font-medium">
                  {a.city} · {a.neighborhood}
                </span>
              </div>
              <span className="text-[10px] tabular-nums text-foreground/55">{a.ago}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] text-foreground/55">
                <span className="font-mono">{a.fromAddr}</span>
                <ArrowRight size={10} />
                <span className="font-mono">{a.toAddr}</span>
              </div>
              <span className="text-xs font-semibold tabular-nums">{a.price.toFixed(3)} SOL</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Footer link */}
      <div className="border-t border-white/30 px-5 py-3">
        <Link
          href="/marketplace/activity"
          className="text-[11px] font-medium text-primary hover:underline"
        >
          View full activity →
        </Link>
      </div>
    </aside>
  );
}
