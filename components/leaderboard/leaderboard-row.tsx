'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, TrendingDown, TrendingUp } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Flag } from '@/components/flag';
import { GradientAvatar } from '@/components/gradient-avatar';
import { RankDelta } from '@/components/rank-delta';
import { fmtCompact } from '@/lib/format';
import type { LeaderboardEntry } from '@/lib/mock-leaderboard';

export function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const router = useRouter();
  const positive = entry.volume24h > 0;
  const handle = entry.username.replace(/^@/, '');
  const href = `/u/${encodeURIComponent(handle)}`;

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
            {String(entry.rank).padStart(2, '0')}
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
            {entry.isYou && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                You
              </span>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell className="w-16 text-center">
        <Flag code={entry.country} size={18} className="mx-auto" />
      </TableCell>

      <TableCell className="text-right">
        <span className="text-sm font-semibold tabular-nums">
          {entry.hexes.toLocaleString()}
        </span>
      </TableCell>

      <TableCell className="text-right">
        <span className="text-sm font-semibold tabular-nums">
          {fmtCompact(entry.bonded)}
        </span>
      </TableCell>

      <TableCell className="text-right">
        <div className="text-sm font-semibold tabular-nums">
          {entry.valueSOL} SOL
        </div>
        <div className="text-[10px] tabular-nums text-foreground/50">
          ${entry.valueUSD.toLocaleString()}
        </div>
      </TableCell>

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
    </TableRow>
  );
}
