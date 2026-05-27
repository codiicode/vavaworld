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
    <div className="flex flex-col gap-3 border-b border-white/30 px-3 py-3 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
      <div>
        <div className="mb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-foreground/55 md:text-[11px]">
          Marketplace
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">
          All Listings
        </h1>
      </div>

      {/* Stats: 2-up grid on mobile, 4-up flex row on desktop. */}
      <div className="grid grid-cols-2 gap-3 md:flex md:items-center md:gap-6">
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
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-foreground/55">
        {label}
      </div>
      <div className="text-base font-semibold tabular-nums tracking-tight text-foreground">{value}</div>
    </div>
  );
}
