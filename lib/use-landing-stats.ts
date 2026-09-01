'use client';

import { useEffect, useState } from 'react';

export type LandingStats = {
  claimedToday: number;
  totalClaimed: number;
  tilesRemaining: number;
  totalCells: number;
  holders: number;
  activeCountries: number;
  topNationIso: string | null;
  topNationHexes: number;
};

/** Shared across the page: several components want the same figures. */
let cached: LandingStats | null = null;
let inFlight: Promise<LandingStats | null> | null = null;

async function load(): Promise<LandingStats | null> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const r = await fetch('/api/landing-stats');
      if (r.ok) cached = (await r.json()) as LandingStats;
    } catch {
      /* leave null — callers fall back to their placeholder */
    } finally {
      inFlight = null;
    }
    return cached;
  })();
  return inFlight;
}

/**
 * Live figures for the marketing page, read from the same Supabase
 * aggregates the app uses. Returns null until loaded so callers can
 * render a placeholder rather than a zero.
 */
export function useLandingStats(): LandingStats | null {
  const [stats, setStats] = useState<LandingStats | null>(null);

  useEffect(() => {
    let alive = true;
    void load().then((s) => {
      if (alive && s) setStats(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  return stats;
}

/** 1,660,954,464,122 → "1.66T" */
export function compact(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return n.toLocaleString('en-US');
  return String(n);
}
