'use client';

import { BarChart3 } from 'lucide-react';

/**
 * /portfolio — placeholder. The real wallet-overview surface (P&L, tile value,
 * tier breakdown, recent activity chart) will land here; for now we want the
 * route to resolve so the new nav entry doesn't 404.
 */
export default function PortfolioPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-8 py-12">
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-8 py-24 text-center">
        <BarChart3 size={28} className="text-muted-foreground" />
        <h1 className="text-lg font-semibold tracking-tight">Portfolio</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Wallet overview is on the way — P&amp;L, tier breakdown, total tile
          value, and recent claim activity. Check back soon.
        </p>
      </div>
    </div>
  );
}
