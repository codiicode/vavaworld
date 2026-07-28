'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Fetches the current claim_count for each requested ISO country code.
 * Used by the selection UI to walk the USD-spec pricing curve (floor =
 * 0.10 + count × 0.00001) per country in real time.
 *
 * Re-fetches when the input set changes. Cached per-iso across renders so
 * adding more hexes from the same country doesn't trigger a refetch storm.
 */
export function useCountryCounts(isos: ReadonlyArray<string>): Map<string, number> {
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const cacheRef = useRef<Map<string, number>>(new Map());

  // Stable join so the effect doesn't re-fire on every render with the same set.
  const key = Array.from(new Set(isos.filter(Boolean))).sort().join(',');

  useEffect(() => {
    if (!key) return;
    const list = key.split(',');
    const missing = list.filter((iso) => !cacheRef.current.has(iso));
    if (missing.length === 0) {
      // Refresh React state from cache so callers get the latest snapshot.
      setCounts(new Map(cacheRef.current));
      return;
    }
    let cancelled = false;
    (async () => {
      for (const iso of missing) {
        try {
          const r = await fetch(`/api/country-count?iso=${encodeURIComponent(iso)}`, {
            cache: 'no-store',
          });
          if (!r.ok) continue;
          const j = (await r.json()) as { claimCount: number };
          if (!cancelled) cacheRef.current.set(iso, j.claimCount ?? 0);
        } catch {
          /* offline ok - leave it uncached so a later attempt can retry */
        }
      }
      if (!cancelled) setCounts(new Map(cacheRef.current));
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return counts;
}
