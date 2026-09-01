'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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
import { Flag } from '@/components/flag';
import { UserLink } from '@/components/user-link';
import { StatTile } from '@/components/ui/stat-tile';
import { type ActivityItem } from '@/lib/mock-marketplace';
import { useActivity } from '@/lib/use-activity';

type ActionFilter = 'all' | 'buy' | 'sell';

const TRIGGER = 'select-trigger';
const CONTENT = 'select-panel';
const TH = 'text-[10px] uppercase tracking-[0.08em] font-medium text-foreground/60';

export default function ActivityPage() {
  const [action, setAction] = useState<ActionFilter>('all');
  const { items } = useActivity();

  const rows = useMemo<ActivityItem[]>(() => {
    if (action === 'all') return [...items];
    return items.filter((a) => a.action === action);
  }, [action, items]);

  const buys = items.filter((a) => a.action === 'buy').length;
  const sells = items.filter((a) => a.action === 'sell').length;
  const volume = items.reduce((s, a) => s + a.price, 0);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8 md:py-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Activity
          </h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-white/40 bg-white/30 px-3 py-1.5 backdrop-blur-md">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#7db4f5]" />
          <span className="text-xs text-foreground/70">Live feed</span>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatCard label="Buys (24h)" value={buys.toString()} accent="accent" />
        <StatCard label="Sells (24h)" value={sells.toString()} accent="rose" />
        <StatCard
          label="Volume (24h)"
          value={`${volume.toFixed(2)} SOL`}
        />
      </div>

      <div className="mb-6 grid max-w-2xl grid-cols-2 gap-4">
        <div>
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
            Event
          </label>
          <Select
            value={action}
            onValueChange={(v) => setAction(v as ActionFilter)}
          >
            <SelectTrigger className={TRIGGER}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className={CONTENT}>
              <SelectItem value="all">All events</SelectItem>
              <SelectItem value="buy">Buys only</SelectItem>
              <SelectItem value="sell">Sells only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/30 px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight">Recent events</h2>
          <span className="text-xs tabular-nums text-foreground/60">
            {rows.length === 0
              ? 'No events match this filter'
              : `Showing ${rows.length} of ${items.length}`}
          </span>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-white/30 hover:bg-transparent">
              <TableHead className={`${TH} w-20`}>Type</TableHead>
              <TableHead className={TH}>Hex</TableHead>
              <TableHead className={TH}>From</TableHead>
              <TableHead className={`${TH} w-6`} />
              <TableHead className={TH}>To</TableHead>
              <TableHead className={`${TH} text-right`}>Price</TableHead>
              <TableHead className={`${TH} w-20 text-right`}>When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow
                key={a.id}
                className="border-white/20 transition-colors hover:bg-white/20"
              >
                <TableCell>
                  <ActionPill action={a.action} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Flag code={a.countryCode} size={16} />
                    <div>
                      <div className="text-sm font-medium leading-tight">
                        {a.city}
                      </div>
                      <div className="mt-0.5 text-[11px] leading-tight text-foreground/55">
                        {a.neighborhood}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <UserLink addr={a.fromAddr} />
                </TableCell>
                <TableCell className="text-foreground/40">
                  <ArrowRight size={12} />
                </TableCell>
                <TableCell>
                  <UserLink addr={a.toAddr} />
                </TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums">
                  {a.price.toFixed(3)} SOL
                </TableCell>
                <TableCell className="text-right text-[11px] tabular-nums text-foreground/55">
                  {a.ago} ago
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="border-t border-white/30 px-6 py-3 text-center text-[11px] text-foreground/55">
          Looking for marketplace listings instead?{' '}
          <Link href="/marketplace" className="font-medium text-foreground/80 underline-offset-2 hover:underline">
            Browse listings
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'accent' | 'rose';
}) {
  return <StatTile label={label} value={value} accent={accent === 'accent'} />;
}

function ActionPill({ action }: { action: 'buy' | 'sell' }) {
  if (action === 'buy') {
    return (
      <span className="inline-flex items-center rounded-full border border-white/12 bg-[#7db4f5]/15 px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/70">
        Buy
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.07] px-2.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/60">
      Sell
    </span>
  );
}
