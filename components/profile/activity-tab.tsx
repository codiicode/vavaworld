'use client';

import { useState } from 'react';
import { ArrowRight, Coins, Hexagon, Shield } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { mockActivity } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'claim' | 'sale' | 'yield' | 'decay';

const ACTIVITY_ICONS = {
  claim: { Icon: Hexagon, className: 'bg-primary/10 text-primary' },
  sale: { Icon: ArrowRight, className: 'bg-emerald-500/10 text-emerald-600' },
  yield: { Icon: Coins, className: 'bg-amber-500/10 text-amber-600' },
  decay: { Icon: Shield, className: 'bg-blue-500/10 text-blue-600' },
} as const;

export function ActivityTab() {
  const [filter, setFilter] = useState<Filter>('all');
  const filtered = mockActivity.filter((a) => filter === 'all' || a.type === filter);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">All Activity</h2>
          <p className="text-xs text-muted-foreground">{filtered.length} events</p>
        </div>
        <ToggleGroup type="single" value={filter} onValueChange={(v) => v && setFilter(v as Filter)}>
          {(['all', 'claim', 'sale', 'yield', 'decay'] as const).map((f) => (
            <ToggleGroupItem key={f} value={f} size="sm" className="text-xs capitalize">
              {f === 'all' ? 'All' : f}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="flex flex-col px-4 py-2">
        {filtered.map((a) => {
          const { Icon, className } = ACTIVITY_ICONS[a.type];
          return (
            <div
              key={a.id}
              className="-mx-1 flex cursor-pointer items-start gap-3 rounded-md px-1 py-3 transition-colors hover:bg-muted/30"
            >
              <div className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', className)}>
                <Icon size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm">{a.description}</span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {a.timestamp}
                  </span>
                </div>
                {a.detail && (
                  <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {a.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
