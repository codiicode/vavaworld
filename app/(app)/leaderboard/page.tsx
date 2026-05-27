'use client';

import { useMemo, useState } from 'react';
import { LeaderboardHeader } from '@/components/leaderboard/leaderboard-header';
import {
  LeaderboardFilters,
  type FilterKey,
  type SortKey,
} from '@/components/leaderboard/leaderboard-filters';
import { PodiumCard } from '@/components/leaderboard/podium-card';
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
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 md:px-8 md:py-8">
      <LeaderboardHeader />

      <LeaderboardFilters
        sort={sort}
        onSortChange={setSort}
        filter={filter}
        onFilterChange={setFilter}
      />

      {podium.length > 0 && (
        <div className="mb-6 grid grid-cols-1 items-end gap-3 sm:grid-cols-3 sm:gap-4">
          {/* Mobile: rank 1, 2, 3 in order. Desktop: 2-1-3 podium layout. */}
          <div className="order-1 sm:order-2">
            {podium[0] && <PodiumCard entry={podium[0]} className="sm:z-10 sm:scale-105" />}
          </div>
          <div className="order-2 sm:order-1">{podium[1] && <PodiumCard entry={podium[1]} />}</div>
          <div className="order-3 sm:order-3">{podium[2] && <PodiumCard entry={podium[2]} />}</div>
        </div>
      )}

      <LeaderboardTable rows={tableRows} />
    </div>
  );
}
