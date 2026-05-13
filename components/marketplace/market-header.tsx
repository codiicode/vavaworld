import { mockMarketStats } from '@/lib/mock-marketplace';

/**
 * Top of the marketplace main column. Eyebrow + page title on the left,
 * 4-stat cluster on the right (Floor / 24h Volume / Listed / 24h Sales).
 *
 * Numbers are intentionally tabular-nums and tight — this header acts as the
 * market's "ticker" so traders glance once and know the state.
 */
export function MarketHeader() {
  return (
    <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
      <div>
        <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-white/52">
          Marketplace
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">All Listings</h1>
      </div>

      <div className="hidden items-center gap-6 md:flex">
        <Stat label="Floor" value={`${mockMarketStats.floor.toFixed(3)} SOL`} />
        <Stat label="24h Volume" value={`${mockMarketStats.volume24h.toFixed(1)} SOL`} />
        <Stat label="Listed" value={mockMarketStats.listedCount.toLocaleString('en-US')} />
        <Stat label="24h Sales" value={String(mockMarketStats.sales24h)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-white/52">
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums tracking-tight text-white">{value}</div>
    </div>
  );
}
