'use client';

import { Activity } from 'lucide-react';

/**
 * Activity feed. Indexer for on-chain claim/transfer events isn't built yet;
 * showing an honest empty state until we have it.
 *
 * TODO: pipe through an indexer that listens on the program's logs and writes
 * to Supabase, then read from there.
 */
export function ActivityTab() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card px-5 py-16 text-center">
      <Activity className="text-muted-foreground" size={24} />
      <p className="text-sm font-medium">Activity feed coming soon</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Once the indexer is live, every claim, transfer, and listing involving
        you will show up here.
      </p>
    </div>
  );
}
