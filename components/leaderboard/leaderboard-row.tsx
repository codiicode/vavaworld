import { Check, TrendingDown, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Flag } from '@/components/flag';
import type { LeaderboardEntry } from '@/lib/mock-leaderboard';

export function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const positive = entry.volume24h > 0;
  return (
    <TableRow className="cursor-pointer border-white/20 transition-colors hover:bg-white/20">
      <TableCell className="w-16 font-mono text-sm tabular-nums text-foreground/60">
        {String(entry.rank).padStart(2, '0')}
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-2 ring-white/40">
            <AvatarFallback className="bg-primary/20 text-sm font-semibold text-primary">
              {entry.username.replace(/^@/, '')[0]?.toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium">
              @{entry.username.replace(/^@/, '')}
            </span>
            {entry.verified && (
              <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
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
          {entry.bonded.toLocaleString()}
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
