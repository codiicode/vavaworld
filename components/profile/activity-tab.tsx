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
    <div
      className="flex flex-col items-center gap-3 overflow-hidden rounded-[18px] border border-white/60 px-5 py-20 text-center"
      style={{
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.5) 100%)',
        backdropFilter: 'blur(22px) saturate(140%)',
        WebkitBackdropFilter: 'blur(22px) saturate(140%)',
        boxShadow:
          '0 18px 50px -20px rgba(8,14,28,0.15), inset 0 1px 0 rgba(255,255,255,0.65)',
      }}
    >
      <Activity className="text-foreground/40" size={24} strokeWidth={1.6} />
      <p className="text-sm font-medium text-foreground">Activity feed coming soon</p>
      <p className="max-w-sm text-xs text-foreground/55">
        Once the indexer is live, every claim, transfer, and listing involving
        you will show up here.
      </p>
    </div>
  );
}
