'use client';

import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { hexCenter } from '@/lib/h3-utils';
import { classifyTier } from '@/lib/tier';
import { quoteBatch, quoteOne } from '@/lib/quote';
import { useCounters } from '@/lib/use-counters';
import { useHexLocations } from '@/lib/use-hex-locations';
import { Flag } from '@/components/flag';

function fmtCoord(value: number, posAxis: 'N' | 'E', negAxis: 'S' | 'W'): string {
  const axis = value >= 0 ? posAxis : negAxis;
  return `${Math.abs(value).toFixed(3)}°${axis}`;
}

/**
 * Linear-style flat list. Each selected hex is a single row (no card border),
 * `hover:bg-muted/50` for affordance. Tier shown as a small primary-tinted pill,
 * not a coloured dot. Total + Claim button anchored to the bottom via flex.
 */
export function SelectionList({
  selectedHexes,
  onRemove,
  onClaim,
  walletConnected,
}: {
  selectedHexes: Set<string>;
  onRemove: (h3: string) => void;
  onClaim: () => void;
  walletConnected: boolean;
}) {
  const counters = useCounters();
  const locations = useHexLocations(selectedHexes);

  const items = Array.from(selectedHexes).map((h3) => {
    const c = hexCenter(h3);
    return { h3, lat: c.lat, lng: c.lng, tier: classifyTier(c.lat, c.lng) };
  });

  // Per-row bonding-curve price: walk the items in order, bumping a local sold count.
  const localSold: Record<1 | 2 | 3, bigint> = { 1: 0n, 2: 0n, 3: 0n };
  const perItemSol = items.map((it) => {
    const sold = counters[it.tier] + localSold[it.tier];
    localSold[it.tier] += 1n;
    return Number(quoteOne(it.tier, sold)) / LAMPORTS_PER_SOL;
  });

  const totalLamports = quoteBatch(items, counters);
  const totalSol = Number(totalLamports) / LAMPORTS_PER_SOL;

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Selected
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">0 / 1000</span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Click a hex to select. Shift-click to add more. Ctrl-drag for an area.
        </p>
        <div className="flex-1" />
        <div className="-mx-5 border-t border-border px-5 pb-5 pt-4">
          <Button size="default" className="w-full font-medium" disabled>
            Select at least one hex
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Selected
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{items.length} / 1000</span>
      </div>

      <ScrollArea className="max-h-[280px]">
        <div className="flex flex-col">
          {items.map((it, i) => {
            const loc = locations.get(it.h3);
            const title = loc?.neighborhood ?? loc?.place ?? loc?.countryName ?? 'Locating…';
            return (
              <div
                key={it.h3}
                className="group -mx-2 flex cursor-pointer items-center justify-between rounded-md px-2 py-2.5 transition-colors hover:bg-muted/50"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Flag code={loc?.countryCode} size={15} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium leading-tight">{title}</span>
                    <span className="mt-0.5 text-[11px] leading-tight tabular-nums text-muted-foreground">
                      {fmtCoord(it.lat, 'N', 'S')}, {fmtCoord(it.lng, 'E', 'W')}
                    </span>
                  </div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
                    T{it.tier}
                  </span>
                  <span className="text-sm font-medium tabular-nums">
                    {perItemSol[i].toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(it.h3);
                    }}
                    className="text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                    aria-label="Remove"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="flex-1" />

      <div className="-mx-5 border-t border-border px-5 pb-5 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Total
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold tabular-nums tracking-tight">
              {totalSol.toFixed(4)}
            </span>
            <span className="text-xs text-muted-foreground">SOL</span>
          </div>
        </div>
        <Button
          size="default"
          className="w-full font-medium"
          disabled={!walletConnected || items.length > 1000}
          onClick={onClaim}
        >
          {items.length > 1000
            ? 'Max 1000 per claim'
            : walletConnected
            ? `Claim ${items.length} ${items.length === 1 ? 'hex' : 'hexes'}`
            : 'Connect wallet to claim'}
        </Button>
      </div>
    </div>
  );
}
