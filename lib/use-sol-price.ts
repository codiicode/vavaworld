'use client';

import { useEffect, useState } from 'react';

// Last-known price survives remounts; 4500 only bridges the very first
// fetch of a session so USD figures never render as $0. The endpoint
// serves ETH/USD (legacy field name from the Solana era).
let cached = 4500;
let fetchedAt = 0;

// Components mounting in the same tick both saw a stale `fetchedAt` and
// each fired their own request — the portfolio page was fetching this
// twice at ~2.8s apiece. Share the in-flight promise so N callers make
// one request.
let inFlight: Promise<number> | null = null;

async function load(): Promise<number> {
  if (Date.now() - fetchedAt < 60_000) return cached;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const r = await fetch('/api/sol-price');
      if (r.ok) {
        const j = (await r.json()) as { solUsd: number };
        if (Number.isFinite(j.solUsd) && j.solUsd > 0) {
          cached = j.solUsd;
        }
      }
    } catch {
      /* keep last-known */
    } finally {
      // Stamp regardless of outcome: on failure this backs off for the
      // window instead of retrying on every mount.
      fetchedAt = Date.now();
      inFlight = null;
    }
    return cached;
  })();

  return inFlight;
}

/** Live ETH/USD from /api/sol-price (legacy route name, server-cached 30s). */
export function useSolPrice(): number {
  const [price, setPrice] = useState(cached);
  useEffect(() => {
    let alive = true;
    void load().then((p) => {
      if (alive) setPrice(p);
    });
    return () => {
      alive = false;
    };
  }, []);
  return price;
}
