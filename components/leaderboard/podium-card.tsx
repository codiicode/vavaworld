import Link from 'next/link';
import { BadgeCheck, Crown, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Flag } from '@/components/flag';
import { GradientAvatar } from '@/components/gradient-avatar';
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
  // Trimmed so the rest of the leaderboard is visible without scrolling.
  const pad = isGold ? 'p-4 md:p-5' : isSilver ? 'p-3.5' : 'p-3';
  const avatarSize = isGold ? 'h-14 w-14 text-base' : isSilver ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs';
  const nameSize = isGold ? 'text-xl md:text-2xl' : isSilver ? 'text-base' : 'text-sm';
  const hexesSize = isGold ? 'text-xs' : 'text-[11px]';

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
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              'grid place-items-center rounded-full font-bold leading-none',
              isGold ? 'h-8 w-8 text-sm' : isSilver ? 'h-7 w-7 text-xs' : 'h-6 w-6 text-[11px]',
              v.chip,
            )}
          >
            {entry.rank}
          </div>
          <span
            className={cn(
              'text-[9.5px] font-semibold uppercase tracking-[0.12em]',
              v.labelColor,
            )}
          >
            {v.label}
          </span>
        </div>
        {isGold && <Crown size={15} strokeWidth={1.8} className="text-amber-500" />}
        {isSilver && <Medal size={15} strokeWidth={1.8} className="text-slate-400" />}
        {!isGold && !isSilver && (
          <Medal size={15} strokeWidth={1.8} className="text-amber-700" />
        )}
      </div>

      {/* Avatar + handle */}
      <div className={cn('mb-3 flex items-center', isGold ? 'gap-3.5' : 'gap-2.5')}>
        <GradientAvatar
          seed={entry.walletAddress || handle}
          initial={initial}
          className={cn(avatarSize, 'ring-white/70 flex-shrink-0')}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={cn('truncate font-semibold tracking-tight text-foreground', nameSize)}>
              @{handle}
            </span>
            {entry.verified && (
              <BadgeCheck
                className={cn('flex-shrink-0 text-emerald-500', isGold ? 'h-4 w-4' : 'h-3.5 w-3.5')}
                aria-label="Verified"
              />
            )}
          </div>
          <div className={cn('mt-0.5 flex items-center gap-1.5 text-foreground/65', hexesSize)}>
            <Flag code={entry.country} size={isGold ? 16 : 13} />
            <span className="tabular-nums font-medium">
              {entry.hexes.toLocaleString()} hexes
            </span>
          </div>
        </div>
      </div>

      {/* Stats - gold gets 3, silver gets 2, bronze gets 1 */}
      <div
        className={cn(
          'grid gap-2.5 border-t border-white/40 pt-2.5',
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
          big ? 'text-[10px]' : 'text-[9.5px]',
        )}
      >
        {label}
      </div>
      <div
        className={cn(
          'font-semibold tabular-nums text-foreground',
          big ? 'text-sm' : 'text-[12.5px]',
        )}
      >
        {value}
      </div>
    </div>
  );
}
