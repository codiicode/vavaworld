'use client';

import { Flame } from 'lucide-react';

/**
 * "Hot Nearby" bottom card on the map sidebar - placeholder until an indexer
 * for recent high-value claims is wired up. We dropped the mocked rows so the
 * UI doesn't lie about what's available right now.
 *
 * TODO: backed by `/api/regions/hot?bbox=…` once the indexer is live.
 */
export function HotNearby() {
  return (
    <div className="border-t border-border px-5 py-4">
      <div className="mb-2 flex items-center gap-1.5">
        <Flame size={12} className="text-muted-foreground" />
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Hot Nearby
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Live activity feed coming soon.
      </p>
    </div>
  );
}
