'use client';

import { useMemo, useState } from 'react';
import { BuyDialog } from '@/components/marketplace/buy-dialog';
import { EmptyState } from '@/components/marketplace/empty-state';
import {
  FilterSidebar,
  defaultFilterState,
  type FilterState,
} from '@/components/marketplace/filter-sidebar';
import { ListingGrid } from '@/components/marketplace/listing-grid';
import { ListingTable, type SortKey } from '@/components/marketplace/listing-table';
import { MarketHeader } from '@/components/marketplace/market-header';
import { QuickChips, type QuickFilter, type ViewMode } from '@/components/marketplace/quick-chips';
import { mockListings, type Listing } from '@/lib/mock-marketplace';

/**
 * Marketplace landing — two-column shell.
 *
 *  240px FilterSidebar │ flexible main
 *
 * Filtering and sorting happen client-side against the mock dataset. When the
 * indexer lands, this whole page becomes a data-shape wrapper around the same
 * components.
 */
export default function MarketplacePage() {
  const [filters, setFilters] = useState<FilterState>(defaultFilterState);
  const [chip, setChip] = useState<QuickFilter>('buy-now');
  const [view, setView] = useState<ViewMode>('table');
  const [sort, setSort] = useState<SortKey>('newest');
  const [buyTarget, setBuyTarget] = useState<Listing | null>(null);

  const visible = useMemo(() => {
    let xs: ReadonlyArray<Listing> = mockListings;

    // Quick-chip narrows first (cheapest filter)
    if (chip === 'auctions') xs = xs.filter((l) => l.isAuction);
    if (chip === 'new24h') {
      xs = xs.filter((l) => l.listedAgo.endsWith('m ago') || l.listedAgo.endsWith('h ago'));
    }
    if (chip === 'price-drop') xs = xs.filter((l) => l.change24h < -3);
    if (chip === 'ending-soon') xs = xs.filter((l) => l.isAuction);
    if (chip === 'whale-watch') xs = xs.filter((l) => l.price >= 0.7);

    // Search
    if (filters.search.trim()) {
      const q = filters.search.toLowerCase();
      xs = xs.filter(
        (l) =>
          l.city.toLowerCase().includes(q) ||
          l.neighborhood.toLowerCase().includes(q) ||
          l.countryCode.toLowerCase().includes(q),
      );
    }

    // Tier
    if (filters.tiers.length > 0) {
      xs = xs.filter((l) => filters.tiers.includes(l.tier));
    }

    // Price
    xs = xs.filter((l) => l.price >= filters.priceMin && l.price <= filters.priceMax);

    // Country
    if (filters.countries.length > 0) {
      xs = xs.filter((l) => filters.countries.includes(l.countryCode));
    }

    // Decay
    xs = xs.filter((l) => l.decayPercent >= filters.decayMin);

    // Status
    if (filters.status === 'auction') xs = xs.filter((l) => l.isAuction);
    // listed and reserve-met both pass everything for now (mock data)

    // Special
    if (filters.iconic) xs = xs.filter((l) => l.isIconic);
    if (filters.newOnly) {
      xs = xs.filter((l) => l.listedAgo.endsWith('m ago') || l.listedAgo.endsWith('h ago'));
    }
    if (filters.whaleOnly) xs = xs.filter((l) => l.price >= 0.6);

    // Sort
    const sorted = [...xs];
    sorted.sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'trending':
          return b.change24h - a.change24h;
        case 'ending':
          return Number(b.isAuction) - Number(a.isAuction);
        case 'newest':
        default:
          // mins ago first, then hours, then days — listedAgo is pre-formatted
          return rankAgo(a.listedAgo) - rankAgo(b.listedAgo);
      }
    });
    return sorted;
  }, [filters, chip, sort]);

  return (
    <div className="flex h-full">
      <FilterSidebar state={filters} onChange={setFilters} />

      <section className="flex flex-1 flex-col overflow-hidden">
        <MarketHeader />
        <QuickChips active={chip} onChange={setChip} view={view} onViewChange={setView} />

        {visible.length === 0 ? (
          <EmptyState onReset={() => setFilters(defaultFilterState)} />
        ) : view === 'table' ? (
          <ListingTable
            listings={visible}
            totalCount={mockListings.length}
            sort={sort}
            onSortChange={setSort}
            onBuy={setBuyTarget}
          />
        ) : (
          <ListingGrid listings={visible} onBuy={setBuyTarget} />
        )}
      </section>

      <BuyDialog
        listing={buyTarget}
        open={buyTarget !== null}
        onOpenChange={(open) => !open && setBuyTarget(null)}
      />
    </div>
  );
}

function rankAgo(s: string): number {
  const n = parseInt(s, 10);
  if (s.includes('m ago')) return n;
  if (s.includes('h ago')) return n * 60;
  if (s.includes('d ago')) return n * 60 * 24;
  return 99999;
}
