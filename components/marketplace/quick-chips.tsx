'use client';

import { Clock, Eye, Hammer, LayoutGrid, List, Sparkles, TrendingDown } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { mockChipCounts } from '@/lib/mock-marketplace';
import { cn } from '@/lib/utils';

export type QuickFilter = 'buy-now' | 'auctions' | 'new24h' | 'price-drop' | 'ending-soon' | 'whale-watch';
export type ViewMode = 'table' | 'grid';

const CHIPS: ReadonlyArray<{ id: QuickFilter; label: string; icon?: typeof Hammer; count: number }> = [
  { id: 'buy-now', label: 'Buy Now', count: mockChipCounts.buyNow },
  { id: 'auctions', label: 'Auctions Live', icon: Hammer, count: mockChipCounts.auctions },
  { id: 'new24h', label: 'New (24h)', icon: Sparkles, count: mockChipCounts.new24h },
  { id: 'price-drop', label: 'Price Drop', icon: TrendingDown, count: mockChipCounts.priceDrop },
  { id: 'ending-soon', label: 'Ending Soon', icon: Clock, count: mockChipCounts.endingSoon },
  { id: 'whale-watch', label: 'Whale Watch', icon: Eye, count: mockChipCounts.whaleWatch },
];

/**
 * Filter chip row + view toggle, sits below the market header.
 *
 * Chips are mutually exclusive — exactly one active. Click an active chip to
 * switch focus, no "deselect to nothing" state (every collector wants *some*
 * subset shown by default).
 */
export function QuickChips({
  active,
  onChange,
  view,
  onViewChange,
}: {
  active: QuickFilter;
  onChange: (next: QuickFilter) => void;
  view: ViewMode;
  onViewChange: (next: ViewMode) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/30 px-6 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {CHIPS.map((c) => {
          const isActive = c.id === active;
          const Icon = c.icon;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-white/30 bg-white/40 text-foreground/65 hover:border-foreground/20 hover:text-foreground',
              )}
            >
              {Icon && <Icon size={12} />}
              {c.label}
              <span className="ml-1 tabular-nums opacity-60">{c.count.toLocaleString('en-US')}</span>
            </button>
          );
        })}
      </div>

      <ToggleGroup
        type="single"
        value={view}
        onValueChange={(v) => v && onViewChange(v as ViewMode)}
      >
        <ToggleGroupItem value="table" size="sm" aria-label="Table view">
          <List size={14} />
        </ToggleGroupItem>
        <ToggleGroupItem value="grid" size="sm" aria-label="Grid view">
          <LayoutGrid size={14} />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
