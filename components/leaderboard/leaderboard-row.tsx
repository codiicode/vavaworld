'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Crown, TrendingDown, TrendingUp } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Flag } from '@/components/flag';
import { GradientAvatar } from '@/components/gradient-avatar';
import { RankDelta } from '@/components/rank-delta';
import { fmtCompact } from '@/lib/format';
import type { RowView, Scope } from '@/lib/mock-leaderboard';

export function LeaderboardRow({ row, scope }: { row: RowView; scope: Scope }) {
  const router = useRouter();
  const { entry } = row;
  const isWorldwide = scope === 'worldwide';
  const positive = entry.volume24h > 0;
  const handle = entry.username.replace(/^@/, '');
  const href = `/u/${encodeURIComponent(handle)}`;
  const president = !isWorldwide && row.isPresident;

  return (
    <TableRow
      onClick={() => router.push(href)}
      className={cn(
        'cursor-pointer border-white/20 transition-colors',
        entry.isYou
          ? 'bg-primary/10 ring-1 ring-inset ring-primary/40 hover:bg-primary/15'
          : 'hover:bg-white/20',
      )}
    >
      <TableCell className="w-20 text-foreground/60">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm tabular-nums">
            {String(row.rank).padStart(2, '0')}
          </span>
          <RankDelta delta={entry.rankDelta} />
        </div>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-3">
          <GradientAvatar
            seed={entry.walletAddress || handle}
            initial={handle[0]?.toUpperCase() ?? '?'}
            className="h-9 w-9 ring-white/40"
            textClassName="text-sm"
          />
          <div className="flex min-w-0 items-center gap-1.5">
            <Link
              href={href}
              onClick={(e) => e.stopPropagation()}
              className="truncate text-sm font-medium underline-offset-2 hover:underline"
            >
              @{handle}
            </Link>
            {entry.verified && (
              <BadgeCheck className="h-4 w-4 flex-shrink-0 text-emerald-500" aria-label="Verified" />
            )}
            {president && (
              <span
                className="inline-flex items-center gap-0.5 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
                title="President of this nation"
              >
                <Crown size={10} className="fill-amber-400" /> President
              </span>
            )}
            {entry.isYou && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                You
              </span>
            )}
          </div>
        </div>
      </TableCell>

      {isWorldwide && (
        <TableCell className="w-16 text-center">
          <Flag code={entry.country} size={18} className="mx-auto" />
        </TableCell>
      )}

      <TableCell className="text-right">
        <span className="text-sm font-semibold tabular-nums">
          {row.hexes.toLocaleString()}
        </span>
      </TableCell>

      <TableCell className="text-right">
        <span className="text-sm font-semibold tabular-nums">
          {fmtCompact(row.bonded)}
        </span>
      </TableCell>

      <TableCell className="text-right">
        <div className="text-sm font-semibold tabular-nums">
          {row.valueSOL.toFixed(1)} SOL
        </div>
        <div className="text-[10px] tabular-nums text-foreground/50">
          ${row.valueUSD.toLocaleString()}
        </div>
      </TableCell>

      {isWorldwide && (
        <TableCell className="text-right">
          <div
            className={cn(
              'flex items-center justify-end gap-1 text-sm tabular-nums',
              positive ? 'text-emerald-600' : 'text-red-600',
            )}
          >
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {positive ? '+' : ''}
            {entry.volume24h} SOL
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}
