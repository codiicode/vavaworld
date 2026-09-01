'use client';

import { useEffect, useMemo, useState } from 'react';
import { LeaderboardHeader } from '@/components/leaderboard/leaderboard-header';
import { StatTile } from '@/components/ui/stat-tile';
import {
  LeaderboardFilters,
  type FilterKey,
  type SortKey,
} from '@/components/leaderboard/leaderboard-filters';
import { PodiumCard } from '@/components/leaderboard/podium-card';
import { ChampionCard } from '@/components/leaderboard/champion-card';
import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table';
import { RankingsSkeleton } from '@/components/rankings-skeleton';
import { useFirstMountLoading } from '@/lib/use-first-mount-loading';
import {
  statsForScope,
  ownsInScope,
  type RowView,
  type Scope,
} from '@/lib/mock-leaderboard';
import { useLeaderboard } from '@/lib/use-leaderboard';
import { COUNTRIES } from '@/lib/countries';

const COUNTRY_NAME = new Map(COUNTRIES.map((c) => [c.code, c.name]));

// Sorts that only make sense worldwide (no per-country equivalent in the data).
const GLOBAL_ONLY_SORTS: ReadonlyArray<SortKey> = ['countries', 'volume'];

export default function LeaderboardPage() {
  const [sort, setSort] = useState<SortKey>('hexes');
  const [filter, setFilter] = useState<FilterKey>('worldwide');
  const firstMount = useFirstMountLoading();
  const { data: board, loading: boardLoading } = useLeaderboard();
  const loading = firstMount || boardLoading;

  const scope: Scope = filter;
  const isWorldwide = scope === 'worldwide';
  const scopeName = isWorldwide ? null : COUNTRY_NAME.get(scope) ?? scope.toUpperCase();

  // A global-only sort can't apply to a national board - fall back to hexes.
  useEffect(() => {
    if (!isWorldwide && GLOBAL_ONLY_SORTS.includes(sort)) setSort('hexes');
  }, [isWorldwide, sort]);

  const rows: RowView[] = useMemo(() => {
    const population = (board?.entries ?? []).filter((e) => ownsInScope(e, scope));

    // In a country scope the #1 bonder holds the presidency - flag them so the
    // crown can follow that person regardless of the active sort.
    let presidentAddr: string | null = null;
    if (!isWorldwide && population.length > 0) {
      presidentAddr = population.reduce((top, e) =>
        statsForScope(e, scope).bonded > statsForScope(top, scope).bonded ? e : top,
      ).walletAddress;
    }

    const resolved = population.map((entry) => {
      const s = statsForScope(entry, scope);
      return {
        entry,
        rank: 0,
        hexes: s.hexes,
        bonded: s.bonded,
        valueSOL: s.valueSOL,
        valueUSD: s.valueUSD,
        countries: entry.countries,
        isPresident: entry.walletAddress === presidentAddr,
      };
    });

    const effectiveSort =
      !isWorldwide && GLOBAL_ONLY_SORTS.includes(sort) ? 'hexes' : sort;

    resolved.sort((a, b) => {
      switch (effectiveSort) {
        case 'volume':
          return b.entry.volume24h - a.entry.volume24h;
        case 'value':
          return b.valueSOL - a.valueSOL;
        case 'countries':
          return b.countries - a.countries;
        case 'bonded':
          return b.bonded - a.bonded;
        case 'hexes':
        default:
          return b.hexes - a.hexes;
      }
    });

    return resolved.map((r, i) => ({ ...r, rank: i + 1 }));
  }, [sort, scope, isWorldwide, board]);

  const podium = rows.slice(0, 3);
  const tableRows = rows.slice(3);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6 md:px-8 md:py-8">
      <LeaderboardHeader />

      <LeaderboardFilters
        sort={sort}
        onSortChange={setSort}
        filter={filter}
        onFilterChange={setFilter}
      />

      {/* The contest at a glance — the page opened straight onto a thin
          champion strip, which gave the most competitive screen in the
          app no weight of its own. */}
      {!loading && rows.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-4">
          <StatTile className="compact" label="Ranked holders" value={rows.length.toLocaleString('en-US')} />
          <StatTile
            className="compact"
            label="Hexes held"
            value={rows.reduce((n, r) => n + r.hexes, 0).toLocaleString('en-US')}
            accent
          />
          <StatTile
            className="compact"
            label="Countries"
            value={new Set(rows.flatMap((r) => (r.countries ? [r.countries] : []))).size.toLocaleString('en-US')}
          />
          <StatTile
            className="compact"
            label="Total value"
            value={`${rows.reduce((n, r) => n + r.valueSOL, 0).toFixed(1)} SOL`}
          />
        </div>
      )}

      {loading ? (
        <RankingsSkeleton />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-14 text-center text-sm text-white/50">
          No holders in {scopeName} yet.
        </div>
      ) : (
        <>
          {podium.length > 0 && (
            <div className="mb-4 flex flex-col gap-2.5">
              {/* #1 - dedicated champion hero (see ChampionCard) */}
              {podium[0] && (
                <ChampionCard row={podium[0]} scope={scope} scopeName={scopeName} />
              )}
              {/* #2 + #3 - side by side, #2 wider so size hierarchy is obvious */}
              {(podium[1] || podium[2]) && (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[3fr_2fr]">
                  {podium[1] && (
                    <PodiumCard row={podium[1]} variant="silver" scope={scope} />
                  )}
                  {podium[2] && (
                    <PodiumCard row={podium[2]} variant="bronze" scope={scope} />
                  )}
                </div>
              )}
            </div>
          )}

          <LeaderboardTable
            rows={tableRows}
            scope={scope}
            scopeName={scopeName}
            total={rows.length}
            totalHolders={board?.totalHolders}
          />
        </>
      )}
    </div>
  );
}
