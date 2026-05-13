'use client';

import { useRouter } from 'next/navigation';
import { TrendingDown, TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { flagEmoji } from '@/lib/flag-emoji';
import type { Listing } from '@/lib/mock-marketplace';
import { cn } from '@/lib/utils';

export type SortKey = 'price-asc' | 'price-desc' | 'newest' | 'ending' | 'trending';

const SORT_LABELS: Record<SortKey, string> = {
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  newest: 'Newest Listings',
  ending: 'Ending Soon',
  trending: 'Most Traded',
};

/**
 * Default view of the marketplace — dense data table with sticky header.
 *
 * Designed for fast scanning: tabular-nums on every number, color-coded
 * 24h delta, decay bar that lets you eyeball health at a glance, and a
 * "Buy" button that only reveals on row hover so the table stays calm.
 *
 * Clicking a row routes to /marketplace/[id] (the Buy button stops propagation
 * so it doesn't navigate the user away from their cart-style intent).
 */
export function ListingTable({
  listings,
  totalCount,
  sort,
  onSortChange,
  onBuy,
}: {
  listings: ReadonlyArray<Listing>;
  totalCount: number;
  sort: SortKey;
  onSortChange: (next: SortKey) => void;
  onBuy: (listing: Listing) => void;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Sort row */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <span className="text-xs tabular-nums text-white/52">
          Showing 1–{listings.length} of {totalCount.toLocaleString('en-US')}
        </span>
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder={SORT_LABELS[sort]} />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <SelectItem key={k} value={k} className="text-xs">
                {SORT_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-[#0a0e1a]/95 backdrop-blur-md [&_th]:text-white/52">
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-20">Tier</TableHead>
              <TableHead className="w-32 text-right">Price</TableHead>
              <TableHead className="w-24">24h</TableHead>
              <TableHead className="w-24 text-right">Last sale</TableHead>
              <TableHead className="w-32">Decay</TableHead>
              <TableHead className="w-20">Listed</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {listings.map((l) => (
              <TableRow
                key={l.id}
                className="group h-14 cursor-pointer border-white/10 hover:bg-white/[0.04]"
                onClick={() => router.push(`/marketplace/${l.id}`)}
              >
                <TableCell className="font-mono text-xs tabular-nums text-white/52">
                  {l.id}
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{flagEmoji(l.countryCode)}</span>
                    <div>
                      <div className="text-sm font-medium leading-tight text-white">{l.city}</div>
                      <div className="mt-0.5 text-[11px] leading-tight text-white/52">
                        {l.neighborhood}
                      </div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider"
                    style={{ background: 'rgba(94,234,212,0.14)', color: 'var(--brand)' }}
                  >
                    T{l.tier}
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  <div className="text-sm font-semibold tabular-nums text-white">{l.price.toFixed(3)} SOL</div>
                  <div className="text-[11px] tabular-nums text-white/52">
                    ${l.priceUsd}
                  </div>
                </TableCell>

                <TableCell>
                  <ChangeCell value={l.change24h} />
                </TableCell>

                <TableCell className="text-right text-sm tabular-nums text-white/52">
                  {l.lastSale != null ? l.lastSale.toFixed(3) : '—'}
                </TableCell>

                <TableCell>
                  <DecayCell percent={l.decayPercent} />
                </TableCell>

                <TableCell className="text-[11px] text-white/52">{l.listedAgo}</TableCell>

                <TableCell className="w-20">
                  <Button
                    size="sm"
                    className="h-7 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBuy(l);
                    }}
                  >
                    Buy
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ChangeCell({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-sm tabular-nums text-white/52">—</span>;
  }
  const positive = value > 0;
  return (
    <div
      className={cn(
        'flex items-center gap-1 text-sm tabular-nums',
        positive ? 'text-emerald-600' : 'text-red-600',
      )}
    >
      {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {positive ? '+' : ''}
      {value.toFixed(1)}%
    </div>
  );
}

function DecayCell({ percent }: { percent: number }) {
  const color =
    percent > 70 ? 'bg-emerald-500' : percent > 30 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1 w-12 overflow-hidden rounded-full bg-white/10">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-[11px] tabular-nums text-white/52">{percent}%</span>
    </div>
  );
}

