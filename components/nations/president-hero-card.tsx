'use client';

import { useState } from 'react';
import { Crown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CountUp } from '@/components/count-up';
import { ChallengePresidencyModal } from './nation-modals';
import {
  type Nation,
  fmtInt,
  fmtUsd,
  truncAddr,
  initials,
} from '@/lib/mock-nations';

const VAVA_USD = 0.01; // mock $/VAVA for the USD equivalent line

/**
 * The nation's head of state. Mirrors the leaderboard ChampionCard treatment
 * (rotating gold ring, pulsing aura, light sweep, floating crown) so the
 * president reads as a trophy, not just a warm-accented card.
 */
export function PresidentHeroCard({ nation }: { nation: Nation }) {
  const [open, setOpen] = useState(false);
  const p = nation.president;

  return (
    <div className="relative">
      {/* Aura glow - sits behind, not clipped, softly pulsing */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-r from-amber-300/50 via-orange-400/40 to-amber-300/50 blur-2xl animate-champion-aura motion-reduce:animate-none"
      />

      <div
        className="relative overflow-hidden rounded-[1.55rem] p-[1.5px]"
        style={{ boxShadow: '0 28px 70px -24px rgba(245,158,11,0.6)' }}
      >
        {/* Rotating conic gold ring - only the card's edge shows it */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[-65%] animate-champion-spin motion-reduce:animate-none"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(253,230,138,0.9) 50deg, rgba(245,158,11,1) 90deg, transparent 150deg, transparent 210deg, rgba(251,191,36,0.9) 260deg, transparent 320deg)',
          }}
        />

        {/* Inner glass surface */}
        <div className="relative overflow-hidden rounded-[1.45rem] border border-amber-200/50 bg-gradient-to-br from-amber-100/55 via-amber-50/35 to-white/25 backdrop-blur-md">
          {/* Light sweep */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent animate-champion-shimmer motion-reduce:hidden"
          />

          <div className="relative p-6 md:p-8">
            <div className="mb-5 flex items-center gap-1.5">
              <Crown size={14} className="fill-amber-400 text-amber-500" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                President
              </span>
            </div>

            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-5 md:gap-6">
                <div className="relative flex-shrink-0">
                  {/* Floating crown */}
                  <Crown
                    size={32}
                    strokeWidth={2}
                    className="absolute -top-4 left-1/2 -translate-x-1/2 -rotate-6 fill-amber-300 text-amber-500 drop-shadow-[0_2px_6px_rgba(245,158,11,0.6)]"
                  />
                  <Avatar className="h-[84px] w-[84px] text-xl ring-[3px] ring-amber-300/80 shadow-[0_0_24px_-4px_rgba(245,158,11,0.7)] md:h-[96px] md:w-[96px] md:text-2xl">
                    <AvatarFallback className="bg-gradient-to-br from-amber-400/30 to-orange-500/20 font-bold text-amber-700">
                      {initials(p.username)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="min-w-0">
                  <div className="truncate bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-[2.25rem]">
                    @{p.username}
                  </div>
                  <div className="mt-1 font-mono text-xs text-foreground/55">
                    {truncAddr(p.wallet)}
                  </div>
                </div>
              </div>

              <div className="md:text-right">
                <CountUp
                  value={p.bondedVava}
                  format={(n) => `${fmtInt(Math.round(n))} $VAVA`}
                  className="block text-3xl font-bold tabular-nums text-foreground md:text-[2rem]"
                />
                <div className="mt-0.5 text-sm tabular-nums text-foreground/55">
                  ≈ {fmtUsd(p.bondedVava * VAVA_USD)}
                </div>
              </div>

              <Button
                variant="outline"
                className="border-amber-300 bg-white/40 text-amber-700 hover:bg-amber-50"
                onClick={() => setOpen(true)}
              >
                Challenge presidency
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-6 border-t border-amber-200/50 pt-5 sm:max-w-md">
              <div>
                <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700/70">
                  Earned this month
                </div>
                <CountUp
                  value={p.earnedThisMonthUsd}
                  format={(n) => fmtUsd(Math.round(n))}
                  className="text-lg font-bold tabular-nums text-foreground"
                />
              </div>
              <div>
                <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700/70">
                  Term length
                </div>
                <CountUp
                  value={p.termDays}
                  format={(n) => `${Math.round(n)} days`}
                  className="text-lg font-bold tabular-nums text-foreground"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ChallengePresidencyModal
        open={open}
        onOpenChange={setOpen}
        countryName={nation.name}
        threshold={p.bondedVava}
      />
    </div>
  );
}
