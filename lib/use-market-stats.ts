'use client';

import { useEffect, useState } from 'react';

export type MarketStats = {
  activeListings: number;
  floorSol: number | null;
  sales24h: number;
  volume24hSol: number;
};

/** Real marketplace aggregates; refetches when `version` bumps. */
export function useMarketStats(version = 0): MarketStats | null {
  const [stats, setStats] = useState<MarketStats | null>(null);
  useEffect(() => {
    let alive = true;
    fetch('/api/market-stats', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json) => {
        if (alive) setStats(json as MarketStats);
      })
      .catch(() => {
        if (alive) setStats(null);
      });
    return () => {
      alive = false;
    };
  }, [version]);
  return stats;
}
