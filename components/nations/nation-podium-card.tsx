import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RankBadge } from '@/components/leaderboard/rank-badge';
import { Flag } from '@/components/flag';
import { cn } from '@/lib/utils';
import {
  type Nation,
  fmtUsd3,
  fmtInt,
  fmtCompact,
  initials,
} from '@/lib/mock-nations';

/** Top-3 country governance card. Rank 1 is scaled up by the page. */
export function NationPodiumCard({
  nation,
  rank,
  className,
}: {
  nation: Nation;
  rank: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <Link
      href={`/nations/${nation.iso}`}
      className={cn(
        'relative block cursor-pointer rounded-2xl border border-white/40 bg-white/30 p-5 backdrop-blur-md transition-colors hover:bg-white/40',
        className,
      )}
    >
      <RankBadge rank={rank} />

      <div className="mb-4 mt-1 flex items-center gap-3">
        <Flag code={nation.iso} size={26} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold tracking-tight">
            {nation.name}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-foreground/60">
            <Avatar className="h-5 w-5 ring-1 ring-white/60">
              <AvatarFallback className="bg-primary/20 text-[10px] font-semibold text-primary">
                {initials(nation.president.username)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">@{nation.president.username}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-white/30 pt-3">
        <Stat label="Floor" value={fmtUsd3(nation.floor)} />
        <Stat label="Claims" value={fmtInt(nation.claims)} />
        <Stat label="Bonded" value={`${fmtCompact(nation.bondedVava)}`} />
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-0.5 text-[10px] uppercase tracking-wider text-foreground/50">
        {label}
      </div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  );
}
