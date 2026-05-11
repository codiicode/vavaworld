'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { flagEmoji } from '@/lib/flag-emoji';

// TODO: replace with `/api/activity?bbox=…&limit=20` once the indexer is up.
const MOCK_ACTIVITY: ReadonlyArray<{
  id: string;
  who: string;
  what: 'claimed' | 'listed' | 'transferred';
  place: string;
  country: string;
  tier: 1 | 2 | 3;
  price: number;
  agoSec: number;
}> = [
  { id: 'a1', who: 'GNfE…CzBt', what: 'claimed', place: 'Stockholm', country: 'se', tier: 1, price: 0.024, agoSec: 14 },
  { id: 'a2', who: '74fW…6b4X', what: 'listed', place: 'Paris', country: 'fr', tier: 1, price: 0.18, agoSec: 47 },
  { id: 'a3', who: 'Bm9c…hF2P', what: 'claimed', place: 'Oslo', country: 'no', tier: 2, price: 0.012, agoSec: 92 },
  { id: 'a4', who: 'Jz3p…91nQ', what: 'transferred', place: 'Tokyo', country: 'jp', tier: 1, price: 0.32, agoSec: 158 },
  { id: 'a5', who: 'AS2k…vYxR', what: 'claimed', place: 'Lisbon', country: 'pt', tier: 2, price: 0.011, agoSec: 244 },
  { id: 'a6', who: 'pT8s…m1bL', what: 'claimed', place: 'Reykjavík', country: 'is', tier: 3, price: 0.002, agoSec: 318 },
  { id: 'a7', who: 'Yi4w…22fV', what: 'listed', place: 'Berlin', country: 'de', tier: 1, price: 0.14, agoSec: 401 },
];

function relativeTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function ActivityFeed() {
  return (
    <div className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Recent
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{MOCK_ACTIVITY.length}</span>
      </div>
      <ScrollArea className="max-h-[420px]">
        <div className="flex flex-col">
          {MOCK_ACTIVITY.map((a) => (
            <div
              key={a.id}
              className="-mx-2 flex items-center justify-between rounded-md px-2 py-2.5 transition-colors hover:bg-muted/50"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="text-sm leading-none">{flagEmoji(a.country) || '🌐'}</span>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm leading-tight">
                    <span className="font-medium">{a.place}</span>{' '}
                    <span className="text-muted-foreground">{a.what}</span>
                  </span>
                  <span className="mt-0.5 truncate text-[11px] leading-tight tabular-nums text-muted-foreground">
                    by {a.who}
                  </span>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
                  T{a.tier}
                </span>
                <span className="text-sm font-medium tabular-nums">{a.price.toFixed(3)}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">{relativeTime(a.agoSec)}</span>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
