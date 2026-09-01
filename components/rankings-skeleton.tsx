/**
 * Loading placeholder for the leaderboard / nations pages: a hero block, the
 * #2+#3 row, then shimmering table rows. Shown briefly on first mount so the
 * ranking reads as "fetching the latest snapshot" rather than popping in cold.
 */
export function RankingsSkeleton({ rows = 8 }: { rows?: number }) {
  const bar = 'animate-pulse rounded-md bg-white/40';
  return (
    <div className="mb-4 flex flex-col gap-2.5" aria-hidden>
      {/* Champion hero */}
      <div className="h-[148px] animate-pulse rounded-[1.55rem] bg-white/[0.07] md:h-[160px]" />

      {/* #2 + #3 */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[3fr_2fr]">
        <div className="h-[118px] animate-pulse rounded-2xl bg-white/35" />
        <div className="h-[118px] animate-pulse rounded-2xl bg-white/30" />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/30 px-6 py-4">
          <div className={`${bar} h-4 w-32`} />
          <div className={`${bar} h-3 w-40`} />
        </div>
        <div className="divide-y divide-white/20">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-3.5">
              <div className={`${bar} h-3 w-8`} />
              <div className={`${bar} h-9 w-9 rounded-full`} />
              <div className={`${bar} h-3.5 w-32`} />
              <div className="ml-auto flex items-center gap-8">
                <div className={`${bar} hidden h-3.5 w-16 sm:block`} />
                <div className={`${bar} hidden h-3.5 w-16 md:block`} />
                <div className={`${bar} h-3.5 w-20`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
