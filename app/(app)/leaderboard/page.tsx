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
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      <LeaderboardHeader />

      <LeaderboardFilters
        sort={sort}
        onSortChange={setSort}
        filter={filter}
        onFilterChange={setFilter}
      />

      {podium.length > 0 && (
        <div className="mb-6 grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
          {/* Rank 2 — left */}
          <div>{podium[1] && <PodiumCard entry={podium[1]} />}</div>
          {/* Rank 1 — middle, slightly larger */}
          <div>{podium[0] && <PodiumCard entry={podium[0]} className="z-10 scale-105" />}</div>
          {/* Rank 3 — right */}
          <div>{podium[2] && <PodiumCard entry={podium[2]} />}</div>
        </div>
      )}

      <LeaderboardTable rows={tableRows} />
    </div>
  );
}
