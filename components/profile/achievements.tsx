import { Crown, Flag as FlagIcon, Globe, Hexagon, Coins, Sparkles, Medal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { achievementsFor, type AchievementIcon } from '@/lib/achievements';
import type { MockUser } from '@/lib/mock-users';

const ICONS: Record<AchievementIcon, typeof Crown> = {
  crown: Crown,
  flag: FlagIcon,
  globe: Globe,
  hexagon: Hexagon,
  coins: Coins,
  sparkles: Sparkles,
  medal: Medal,
};

export function Achievements({ user }: { user: MockUser }) {
  const earned = achievementsFor(user);
  if (earned.length === 0) return null;

  return (
    <div className="mt-6 border-t border-white/30 pt-5">
      <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
        Achievements
      </div>
      <div className="flex flex-wrap gap-2">
        {earned.map((a) => {
          const Icon = ICONS[a.icon];
          return (
            <div
              key={a.id}
              title={a.description}
              className={cn(
                'flex items-center gap-2 rounded-full border px-3 py-1.5 backdrop-blur-md transition-transform hover:-translate-y-0.5',
                a.gold
                  ? 'border-amber-300/60 bg-gradient-to-br from-amber-200/40 to-orange-200/20'
                  : 'border-white/40 bg-white/30',
              )}
            >
              <Icon
                size={14}
                strokeWidth={1.9}
                className={a.gold ? 'text-amber-600' : 'text-foreground/70'}
              />
              <span className="text-[12.5px] font-semibold text-foreground">{a.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
