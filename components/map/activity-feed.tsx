'use client';

import { Activity } from 'lucide-react';

/**
 * Activity tab on the map sidebar - empty state until the on-chain event
 * indexer is built. Replaces a previous mock list so the UI doesn't lie.
 */
export function ActivityFeed() {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <Activity className="text-muted-foreground" size={20} />
      <p className="text-xs font-medium">Live activity coming soon</p>
      <p className="max-w-[220px] text-[11px] text-muted-foreground">
        Once the indexer is up, claims and listings will stream in here.
      </p>
    </div>
  );
}
