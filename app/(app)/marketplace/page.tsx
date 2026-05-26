'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Flag } from '@/components/flag';
import { ListingGrid } from '@/components/marketplace/listing-grid';
import {
  mockChipCounts,
  mockCountryCounts,
  mockListings,
  mockMarketStats,
  type Listing,
  type Tier,
} from '@/lib/mock-marketplace';

type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'trending';

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest',
  'price-asc': 'Price: Low → High',
  'price-desc': 'Price: High → Low',
  trending: 'Trending',
};

const TIER_OPTIONS: ReadonlyArray<{ value: 'all' | Tier; label: string }> = [
  { value: 'all', label: 'All tiers' },
  { value: 1, label: 'Tier 1' },
  { value: 2, label: 'Tier 2' },
  { value: 3, label: 'Tier 3' },
];

const TRIGGER =
  'bg-white/40 backdrop-blur-md border-white/40 h-11 rounded-xl text-foreground';
const CONTENT = 'bg-white/90 backdrop-blur-xl border-white/40';

/**
 * Marketplace — minimal, glass-card grid matching the leaderboard / profile vibe.
 * Filters live in a single top row (search · country · tier · sort) instead of a
 * dense side rail; listings render as satellite-preview tiles.
 */
export default function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState<'all' | string>('all');
  const [tier, setTier] = useState<'all' | Tier>('all');
  const [sort, setSort] = useState<SortKey>('newest');

  const visible = useMemo(() => {
    let xs: ReadonlyArray<Listing> = mockListings;

    if (search.trim()) {
      const q = search.toLowerCase();
      xs = xs.filter(
        (l) =>
          l.city.toLowerCase().includes(q) ||
          l.neighborhood.toLowerCase().includes(q) ||
          l.countryCode.toLowerCase().includes(q),
      );
    }
    if (country !== 'all') xs = xs.filter((l) => l.countryCode === country);
    if (tier !== 'all') xs = xs.filter((l) => l.tier === tier);

    return [...xs].sort((a, b) => {
      switch (sort) {
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        case 'trending':
          return b.change24h - a.change24h;
        case 'newest':
        default:
          return rankAgo(a.listedAgo) - rankAgo(b.listedAgo);
      }
    });
  }, [search, country, tier, sort]);

  const reset = () => {
    setSearch('');
    setCountry('all');
    setTier('all');
    setSort('newest');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
            Market
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Marketplace
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            Buy and sell hexes across vavaworld
          </p>
        </div>
      </div>

      {/* Stat strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Floor" value={`${mockMarketStats.floor.toFixed(3)} SOL`} />
        <Stat label="Volume (24h)" value={`${mockMarketStats.volume24h} SOL`} />
        <Stat
          label="Listed"
          value={mockMarketStats.listedCount.toLocaleString('en-US')}
        />
        <Stat
          label="Sales (24h)"
          value={mockChipCounts.new24h.toLocaleString('en-US')}
        />
      </div>

      {/* Filter row */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/55"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search city, neighborhood, country…"
            className={`${TRIGGER} pl-9`}
          />
        </div>
        <Select value={country} onValueChange={(v) => setCountry(v)}>
          <SelectTrigger className={`${TRIGGER} sm:w-44`}>
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent className={CONTENT}>
            <SelectItem value="all">All countries</SelectItem>
            {mockCountryCounts.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                <span className="flex items-center gap-2">
                  <Flag code={c.code} size={14} />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(tier)}
          onValueChange={(v) => setTier(v === 'all' ? 'all' : (Number(v) as Tier))}
        >
          <SelectTrigger className={`${TRIGGER} sm:w-32`}>
            <SelectValue placeholder="Tier" />
          </SelectTrigger>
          <SelectContent className={CONTENT}>
            {TIER_OPTIONS.map((o) => (
              <SelectItem key={String(o.value)} value={String(o.value)}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className={`${TRIGGER} sm:w-40`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={CONTENT}>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                {SORT_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Count */}
      <div className="mb-4 flex items-center justify-between text-xs text-foreground/60">
        <span className="tabular-nums">
          {visible.length === 0
            ? 'No listings match these filters'
            : `Showing ${visible.length} of ${mockListings.length.toLocaleString('en-US')}`}
        </span>
        {(search || country !== 'all' || tier !== 'all') && (
          <button
            type="button"
            onClick={reset}
            className="font-medium text-foreground/70 underline-offset-2 hover:text-foreground hover:underline"
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-white/40 bg-white/30 px-6 py-20 text-center text-sm text-foreground/60 backdrop-blur-md">
          Try widening the search, dropping the tier, or picking a different country.
        </div>
      ) : (
        <ListingGrid listings={visible} />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/30 px-4 py-3 backdrop-blur-md">
      <div className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-foreground/60">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </div>
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
