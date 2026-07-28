import { Flag } from '@/components/flag';
import {
  type Nation,
  fmtUsd3,
  fmtInt,
  fmtCompact,
} from '@/lib/mock-nations';

export function CountryHeaderCard({ nation }: { nation: Nation }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/30 p-6 backdrop-blur-md">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Flag code={nation.iso} size={44} />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {nation.name}
            </h1>
            <div className="mt-0.5 text-xs uppercase tracking-[0.14em] text-foreground/50">
              {nation.iso}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4">
          <Metric label="Floor" value={fmtUsd3(nation.floor)} />
          <Metric label="Claims" value={fmtInt(nation.claims)} />
          <Metric label="Bonded $VAVA" value={fmtCompact(nation.bondedVava)} />
          <Metric label="Bonders" value={fmtInt(nation.bonders)} />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-foreground/50">
        {label}
      </div>
      <div className="text-xl font-bold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}
