import { cn } from '@/lib/utils';

/**
 * Circular gold / silver / bronze rank medallion for the podium cards.
 * Gradients kept subtle (not glittery) per the brief.
 */
export function RankBadge({ rank }: { rank: 1 | 2 | 3 }) {
  return (
    <div
      className={cn(
        'absolute -left-3 -top-3 flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-white shadow-md',
        rank === 1 && 'bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-500',
        rank === 2 && 'bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500',
        rank === 3 && 'bg-gradient-to-br from-amber-600 via-orange-700 to-amber-800',
      )}
    >
      {rank}
    </div>
  );
}
