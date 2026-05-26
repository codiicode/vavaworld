import Link from 'next/link';
import { Check, Crown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Flag } from '@/components/flag';
import type { LeaderboardEntry } from '@/lib/mock-leaderboard';

type Variant = 'gold' | 'silver' | 'bronze';

const VARIANT = {
  gold: {
    border: 'border-amber-400/60',
    bg: 'bg-gradient-to-br from-amber-200/40 via-amber-100/25 to-white/20',
    shadow:
      '0 24px 60px -22px rgba(245,158,11,0.55), inset 0 1px 0 rgba(255,255,255,0.65)',
    label: 'Champion',
    labelColor: 'text-amber-700',
    chip:
      'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_6px_20px_-6px_rgba(245,158,11,0.65)]',
  },
  silver: {
    border: 'border-slate-300/60',
    bg: 'bg-gradient-to-br from-slate-200/40 via-white/20 to-white/15',
    shadow: '0 14px 40px -16px rgba(100,116,139,0.45), inset 0 1px 0 rgba(255,255,255,0.55)',
    label: '2nd',
    labelColor: 'text-slate-600',
    chip: 'bg-gradient-to-br from-slate-300 to-slate-500 text-white',
  },
  bronze: {
    border: 'border-orange-400/45',
    bg: 'bg-gradient-to-br from-orange-200/30 via-white/15 to-white/10',
    shadow: '0 10px 30px -14px rgba(180,83,9,0.40), inset 0 1px 0 rgba(255,255,255,0.5)',
    label: '3rd',
    labelColor: 'text-orange-700',
    chip: 'bg-gradient-to-br from-amber-600 to-orange-700 text-white',
  },
} as const satisfies Record<Variant, {
  border: string; bg: string; shadow: string;
  label: string; labelColor: string; chip: string;
}>;

/**
 * Featured top-3 card with three explicit size variants so the visual weight
 * decreases from gold → silver → bronze. Lays out the rank chip + handle on
 * top, then 2 (silver/bronze) or 3 (gold) stat tiles underneath.
 */
export function PodiumCard({
  entry,
  variant,
  className,
}: {
  entry: LeaderboardEntry;
  variant: Variant;
  className?: string;
}) {
  const v = VARIANT[variant];
  const handle = entry.username.replace(/^@/, '');
  const initial = handle[0]?.toUpperCase() ?? '?';
  const isGold = variant === 'gold';
  const isSilver = variant === 'silver';

  // Each variant gets its own scale of paddings, avatars, type.
  const pad = isGold ? 'p-7 md:p-8' : isSilver ? 'p-5' : 'p-4';
  const avatarSize = isGold ? 'h-20 w-20 text-xl' : isSilver ? 'h-14 w-14 text-base' : 'h-11 w-11 text-sm';
  const nameSize = isGold ? 'text-2xl md:text-3xl' : isSilver ? 'text-lg' : 'text-base';
  const hexesSize = isGold ? 'text-sm' : 'text-xs';

  return (
    <Link
      href={`/u/${encodeURIComponent(handle)}`}
      className={cn(
        'group relative block rounded-2xl border backdrop-blur-md transition-transform duration-200 hover:-translate-y-0.5',
        v.border,
        v.bg,
        pad,
        className,
      )}
      style={{ boxShadow: v.shadow }}
    >
      {/* Rank chip + label */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'grid place-items-center rounded-full font-bold leading-none',
              isGold ? 'h-10 w-10 text-base' : isSilver ? 'h-8 w-8 text-sm' : 'h-7 w-7 text-xs',
              v.chip,
            )}
          >
            {entry.rank}
          </div>
          <span
            className={cn(
              'text-[10px] font-semibold uppercase tracking-[0.12em]',
              v.labelColor,
            )}
          >
            {v.label}
          </span>
        </div>
        {isGold && <Crown size={18} strokeWidth={1.8} className="text-amber-500" />}
      </div>

      {/* Avatar + handle */}
      <div className={cn('mb-5 flex items-center', isGold ? 'gap-5' : 'gap-3')}>
        <Avatar className={cn(avatarSize, 'ring-2 ring-white/70 flex-shrink-0')}>
          <AvatarFallback className="bg-primary/20 font-semibold text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={cn('truncate font-semibold tracking-tight text-foreground', nameSize)}>
              @{handle}
            </span>
            {entry.verified && (
              <Check className={cn('flex-shrink-0 text-emerald-500', isGold ? 'h-5 w-5' : 'h-3.5 w-3.5')} />
            )}
          </div>
          <div className={cn('mt-1 flex items-center gap-2 text-foreground/65', hexesSize)}>
            <Flag code={entry.country} size={isGold ? 20 : 16} />
            <span className="tabular-nums font-medium">
              {entry.hexes.toLocaleString()} hexes
            </span>
          </div>
        </div>
      </div>

      {/* Stats — gold gets 3, silver gets 2, bronze gets 1 */}
      <div
        className={cn(
          'grid gap-3 border-t border-white/40 pt-4',
          isGold ? 'grid-cols-3' : isSilver ? 'grid-cols-2' : 'grid-cols-1',
        )}
      >
        <Stat label="Value" value={`${entry.valueSOL} SOL`} big={isGold} />
        {(isGold || isSilver) && (
          <Stat label="Countries" value={String(entry.countries)} big={isGold} />
        )}
        {isGold && (
          <Stat label="Bonded" value={`${(entry.bonded / 1_000_000).toFixed(2)}M`} big />
        )}
      </div>
    </Link>
  );
}

function Stat({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div>
      <div
        className={cn(
          'mb-0.5 uppercase tracking-wider text-foreground/55',
          big ? 'text-[10.5px]' : 'text-[10px]',
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          'font-semibold tabular-nums text-foreground',
          big ? 'text-base' : 'text-sm',
        )}
      >
        {value}
      </div>
    </div>
  );
}
