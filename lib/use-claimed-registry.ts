'use client';

import { useEffect, useState } from 'react';
import { useClaimDoneListener } from './claim-events';

export type ClaimedInfo = {
  owner: string;
  username: string | null;
  priceUsd: number;
  /** ms epoch */
  claimedAt: number;
  imageUrl: string | null;
  /** Claim tx hash - hexes sharing it were bought as ONE property. */
  tx: string | null;
};

// Module-level so re-mounts (map ↔ other pages) render instantly from the
// last snapshot while a refresh happens in the background.
let cache: Map<string, ClaimedInfo> = new Map();
let fetchedAt = 0;
const listeners = new Set<(m: Map<string, ClaimedInfo>) => void>();

async function load(force = false): Promise<void> {
  if (!force && Date.now() - fetchedAt < 10_000) return;
  try {
    const r = await fetch('/api/claimed', { cache: 'no-store' });
    if (!r.ok) return;
    const j = (await r.json()) as {
      hexes: Array<{ h3: string; owner: string; username: string | null; priceUsd: number; claimedAt: string; imageUrl: string | null; tx: string | null }>;
    };
    const next = new Map<string, ClaimedInfo>();
    for (const h of j.hexes) {
      next.set(h.h3, {
        owner: h.owner,
        username: h.username,
        priceUsd: h.priceUsd,
        claimedAt: Date.parse(h.claimedAt),
        imageUrl: h.imageUrl ?? null,
        tx: h.tx ?? null,
      });
    }
    cache = next;
    fetchedAt = Date.now();
    for (const fn of listeners) fn(cache);
  } catch {
    /* offline ok - next poll retries */
  }
}

/**
 * Registry of every claimed hex (off-chain ledger + usernames). Refreshes
 * every 30s while visible and right after a local claim confirms. Consumers
 * treat it as the authority on "is this hex taken and by whom" - the
 * on-chain PDA check only covers on-chain claims.
 */
export function useClaimedRegistry(): Map<string, ClaimedInfo> {
  const [map, setMap] = useState<Map<string, ClaimedInfo>>(cache);

  useEffect(() => {
    listeners.add(setMap);
    void load();
    const t = window.setInterval(() => {
      if (!document.hidden) void load();
    }, 30_000);
    return () => {
      listeners.delete(setMap);
      window.clearInterval(t);
    };
  }, []);

  useClaimDoneListener(() => {
    window.setTimeout(() => void load(true), 800);
  });

  return map;
}

/** Force an immediate registry refresh (e.g. right after setting a property image). */
export function refreshClaimedRegistry(): void {
  void load(true);
}
