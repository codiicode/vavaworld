'use client';

import { useEffect, useState } from 'react';

// Last-known price survives remounts; 150 only bridges the very first
// fetch of a session so USD figures never render as $0.
let cached = 150;
let fetchedAt = 0;

async function load(): Promise<number> {
  if (Date.now() - fetchedAt < 60_000) return cached;
  try {
    const r = await fetch('/api/sol-price');
    if (r.ok) {
      const j = (await r.json()) as { solUsd: number };
      if (Number.isFinite(j.solUsd) && j.solUsd > 0) {
        cached = j.solUsd;
        fetchedAt = Date.now();
      }
    }
  } catch {
    /* keep last-known */
  }
  return cached;
}

/** Live SOL/USD from /api/sol-price (Jupiter, server-cached 30s). */
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
