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
    <div className="glass glass--inset relative flex flex-col items-center gap-3 overflow-hidden rounded-[22px] px-5 py-16 text-center">
      <Activity className="relative z-[1] text-white/40" size={24} />
      <p className="relative z-[1] text-sm font-medium text-white">Activity feed coming soon</p>
      <p className="relative z-[1] max-w-sm text-xs text-white/52">
        Once the indexer is live, every claim, transfer, and listing involving
        you will show up here.
      </p>
    </div>
  );
}
