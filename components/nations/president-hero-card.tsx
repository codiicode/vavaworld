'use client';

import { useState } from 'react';
import { Crown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChallengePresidencyModal } from './nation-modals';
import {
  type Nation,
  fmtInt,
  fmtUsd,
  truncAddr,
  initials,
} from '@/lib/mock-nations';

const VAVA_USD = 0.01; // mock $/VAVA for the USD equivalent line

export function PresidentHeroCard({ nation }: { nation: Nation }) {
  const [open, setOpen] = useState(false);
  const p = nation.president;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-300/70 bg-white/35 backdrop-blur-md">
      {/* Warm accent top stripe — elevates the president above regular cards */}
      <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500" />

      <div className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Crown size={14} className="text-amber-500" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-600">
            President
          </span>
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 ring-2 ring-amber-300/70">
              <AvatarFallback className="bg-amber-400/20 font-semibold text-amber-700">
                {initials(p.username)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold tracking-tight text-foreground">
                @{p.username}
              </div>
              <div className="mt-0.5 font-mono text-xs text-foreground/55">
                {truncAddr(p.wallet)}
              </div>
            </div>
          </div>

          <div className="md:text-right">
            <div className="text-2xl font-bold tabular-nums text-foreground">
              {fmtInt(p.bondedVava)} $VAVA
            </div>
            <div className="mt-0.5 text-sm tabular-nums text-foreground/55">
              ≈ {fmtUsd(p.bondedVava * VAVA_USD)}
            </div>
          </div>

          <Button
            variant="outline"
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
            onClick={() => setOpen(true)}
          >
            Challenge presidency
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/40 pt-4 sm:max-w-md">
          <div>
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-foreground/50">
              Earned this month
            </div>
            <div className="text-base font-semibold tabular-nums text-foreground">
              {fmtUsd(p.earnedThisMonthUsd)}
            </div>
          </div>
          <div>
            <div className="mb-0.5 text-[10px] uppercase tracking-wider text-foreground/50">
              Term length
            </div>
            <div className="text-base font-semibold tabular-nums text-foreground">
              {p.termDays} days
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
