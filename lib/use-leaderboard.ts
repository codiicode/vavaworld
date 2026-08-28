'use client';

import { useEffect, useState } from 'react';
import type { LeaderboardEntry } from './mock-leaderboard';

export type LeaderboardData = {
  entries: LeaderboardEntry[];
  totalHolders: number;
  totalHexes: number;
  activeCountries: number;
  totalVolumeUsd: number;
};

/**
 * Real leaderboard from /api/leaderboard (indexer aggregates over the
 * hexes table). Shape-compatible with the old mock so the page renders
 * identically; token-era fields are 0 until those systems ship.
 */
export function useLeaderboard(): { data: LeaderboardData | null; loading: boolean } {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch('/api/leaderboard')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => {
        if (alive) setData(json as LeaderboardData);
      })
      .catch(() => {
        if (alive) setData({ entries: [], totalHolders: 0, totalHexes: 0, activeCountries: 0, totalVolumeUsd: 0 });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { data, loading };
}
