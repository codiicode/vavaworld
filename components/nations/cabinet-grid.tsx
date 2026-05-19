import { Shield } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  type Nation,
  fmtInt,
  fmtUsd,
  truncAddr,
  initials,
} from '@/lib/mock-nations';

export function CabinetGrid({ nation }: { nation: Nation }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Shield size={14} className="text-foreground/50" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
          Cabinet
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {nation.cabinet.map((m, i) => (
          <div
            key={m.wallet}
            className="relative overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md"
          >
            <div className="h-1 w-full bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300" />
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-xs text-foreground/45">
                  #{i + 2}
                </span>
                <Avatar className="h-7 w-7 ring-2 ring-white/40">
                  <AvatarFallback className="bg-primary/20 text-[11px] font-semibold text-primary">
                    {initials(m.username)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="truncate text-sm font-semibold tracking-tight">
                @{m.username}
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-foreground/50">
                {truncAddr(m.wallet)}
              </div>
              <div className="mt-3 border-t border-white/30 pt-3">
                <div className="text-sm font-bold tabular-nums text-foreground">
                  {fmtInt(m.bondedVava)} $VAVA
                </div>
                <div className="mt-0.5 text-xs tabular-nums text-foreground/55">
                  {fmtUsd(m.monthlyUsd)} / month
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
