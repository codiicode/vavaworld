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
    <div className="flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-white/40 bg-white/30 px-5 py-20 text-center backdrop-blur-md">
      <Activity className="text-foreground/40" size={24} strokeWidth={1.6} />
      <p className="text-sm font-medium text-foreground">Activity feed coming soon</p>
      <p className="max-w-sm text-xs text-foreground/55">
        Once the indexer is live, every claim, transfer, and listing involving
        you will show up here.
      </p>
    </div>
  );
}
