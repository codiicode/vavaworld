'use client';

import { useMemo, useState } from 'react';
import { LeaderboardHeader } from '@/components/leaderboard/leaderboard-header';
import {
  LeaderboardFilters,
  type FilterKey,
  type SortKey,
} from '@/components/leaderboard/leaderboard-filters';
import { PodiumCard } from '@/components/leaderboard/podium-card';
import { ChampionCard } from '@/components/leaderboard/champion-card';
import { LeaderboardTable } from '@/components/leaderboard/leaderboard-table';
import { mockLeaderboard } from '@/lib/mock-leaderboard';

export default function LeaderboardPage() {
  const [sort, setSort] = useState<SortKey>('hexes');
  const [filter, setFilter] = useState<FilterKey>('worldwide');

  const list = useMemo(() => {
    const filtered =
      filter === 'worldwide'
        ? mockLeaderboard
        : mockLeaderboard.filter((e) => e.country === filter);

    const sorted = [...filtered].sort((a, b) => {
      switch (sort) {
        case 'volume':
          return b.volume24h - a.volume24h;
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

    // Re-position so the rank column stays coherent under the active sort.
    return sorted.map((e, i) => ({ ...e, rank: i + 1 }));
  }, [sort, filter]);

  const podium = list.slice(0, 3);
  const tableRows = list.slice(3);

  return (
    <div className="mx-auto max-w-7xl xl:max-w-[1500px] 2xl:max-w-[1800px] min-[1920px]:max-w-[2100px] min-[2560px]:max-w-[2400px] px-4 py-6 md:px-8 md:py-8 2xl:px-10">
      <LeaderboardHeader />

      <LeaderboardFilters
        sort={sort}
        onSortChange={setSort}
        filter={filter}
        onFilterChange={setFilter}
      />

      {podium.length > 0 && (
        <div className="mb-4 flex flex-col gap-2.5">
          {/* #1 - dedicated champion hero (see ChampionCard) */}
          {podium[0] && <ChampionCard entry={podium[0]} />}
          {/* #2 + #3 - side by side, #2 wider so size hierarchy is obvious */}
          {(podium[1] || podium[2]) && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-[3fr_2fr]">
              {podium[1] && <PodiumCard entry={podium[1]} variant="silver" />}
              {podium[2] && <PodiumCard entry={podium[2]} variant="bronze" />}
            </div>
          )}
        </div>
      )}

      <LeaderboardTable rows={tableRows} />
    </div>
  );
}
