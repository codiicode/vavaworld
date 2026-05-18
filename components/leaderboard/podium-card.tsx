import { Check } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { RankBadge } from './rank-badge';
import { Flag } from '@/components/flag';
import type { LeaderboardEntry } from '@/lib/mock-leaderboard';

/**
 * Featured top-3 card. Rank 1 is rendered slightly larger by the page
 * (scale-105 z-10) so the podium reads at a glance.
 */
export function PodiumCard({
  entry,
  className,
}: {
  entry: LeaderboardEntry;
  className?: string;
}) {
  const rank = entry.rank as 1 | 2 | 3;
  return (
    <div
      className={cn(
        'relative cursor-pointer rounded-2xl border border-white/40 bg-white/30 p-5 backdrop-blur-md transition-colors hover:bg-white/40',
        className,
      )}
    >
      <RankBadge rank={rank} />

      <div className="mb-4 mt-1 flex items-center gap-3">
        <Avatar className="h-12 w-12 ring-2 ring-white/60">
          <AvatarFallback className="bg-primary/20 font-semibold text-primary">
            {entry.username.replace(/^@/, '')[0]?.toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-base font-semibold tracking-tight">
              @{entry.username.replace(/^@/, '')}
            </span>
            {entry.verified && (
              <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground/60">
            <Flag code={entry.country} size={20} />
            <span className="tabular-nums">
              {entry.hexes.toLocaleString()} hexes
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-white/30 pt-3">
        <div>
          <div className="mb-0.5 text-[10px] uppercase tracking-wider text-foreground/50">
            Value
          </div>
          <div className="text-sm font-semibold tabular-nums">
            {entry.valueSOL} SOL
          </div>
        </div>
        <div>
          <div className="mb-0.5 text-[10px] uppercase tracking-wider text-foreground/50">
            Countries
          </div>
          <div className="text-sm font-semibold tabular-nums">
            {entry.countries}
          </div>
        </div>
      </div>
    </div>
  );
}
