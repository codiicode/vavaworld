import Link from 'next/link';
import { BadgeCheck, Crown } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Flag } from '@/components/flag';
import { CountUp } from '@/components/count-up';
import { fmtCompact } from '@/lib/format';
import type { RowView, Scope } from '@/lib/mock-leaderboard';

/**
 * The #1 hero. Diverges from the silver/bronze PodiumCard so the top spot
 * reads as a trophy (rotating gold ring, pulsing aura, light sweep, floating
 * crown, gold-gradient name). Stats are scope-resolved: worldwide shows the
 * global flex; a country scope shows in-country holdings + the presidency.
 */
export function ChampionCard({
  row,
  scope,
  scopeName,
}: {
  row: RowView;
  scope: Scope;
  scopeName: string | null;
}) {
  const { entry } = row;
  const handle = entry.username.replace(/^@/, '');
  const initial = handle[0]?.toUpperCase() ?? '?';
  const isWorldwide = scope === 'worldwide';
  const president = !isWorldwide && row.isPresident;

  return (
    <div className="relative">
      {/* Aura glow - sits behind, not clipped, softly pulsing */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-r from-amber-300/50 via-orange-400/40 to-amber-300/50 blur-2xl animate-champion-aura motion-reduce:animate-none"
      />

      <Link
        href={`/u/${encodeURIComponent(entry.verified ? handle : entry.walletAddress)}`}
        className="group relative block overflow-hidden rounded-[1.55rem] p-[1.5px] transition-transform duration-200 hover:-translate-y-0.5"
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
        <div className="relative overflow-hidden rounded-[1.45rem] border border-amber-200/50 bg-gradient-to-br from-amber-100/55 via-amber-50/35 to-white/25 p-6 backdrop-blur-md md:p-8">
          {/* Light sweep */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent animate-champion-shimmer motion-reduce:hidden"
          />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-8">
            {/* Identity */}
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
                    {initial}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Crown size={13} className="fill-amber-400 text-amber-500" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
                    {president ? `President of ${scopeName}` : isWorldwide ? 'Champion' : `#1 in ${scopeName}`}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="truncate bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-[2.25rem]">
                    {entry.verified ? `@${handle}` : handle}
                  </span>
                  {entry.verified && (
                    <BadgeCheck className="h-6 w-6 flex-shrink-0 text-emerald-500" aria-label="Verified" />
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-sm text-foreground/70">
                  <Flag code={isWorldwide ? entry.country : scope} size={18} />
                  <CountUp
                    value={row.hexes}
                    format={(n) => Math.round(n).toLocaleString('en-US')}
                    className="font-semibold tabular-nums text-foreground"
                  />
                  <span className="text-foreground/60">
                    {isWorldwide ? (row.hexes === 1 ? 'hex' : 'hexes') : `${row.hexes === 1 ? 'hex' : 'hexes'} in ${scopeName}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid flex-shrink-0 grid-cols-3 gap-6 border-t border-amber-200/50 pt-5 md:gap-9 md:border-l md:border-t-0 md:pl-9 md:pt-0">
              <ChampStat
                label="Value"
                value={row.valueSOL}
                format={(n) => `${n.toFixed(1)} SOL`}
              />
              {isWorldwide ? (
                <ChampStat
                  label="Countries"
                  value={row.countries}
                  format={(n) => String(Math.round(n))}
                />
              ) : (
                <ChampStat
                  label="Worldwide"
                  value={entry.hexes}
                  format={(n) => fmtCompact(Math.round(n))}
                />
              )}
              <ChampStat
                label="Bonded"
                value={row.bonded}
                format={(n) => `${(n / 1_000_000).toFixed(2)}M`}
              />
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function ChampStat({
  label,
  value,
  format,
}: {
  label: string;
  value: number;
  format: (n: number) => string;
}) {
  return (
    <div>
      <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-700/70">
        {label}
      </div>
      <CountUp
        value={value}
        format={format}
        className="text-lg font-bold tabular-nums text-foreground md:text-xl"
      />
    </div>
  );
}
