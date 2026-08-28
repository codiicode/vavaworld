'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ShoppingBag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CountrySelect } from '@/components/country-select';
import { ListingGrid } from '@/components/marketplace/listing-grid';
import { type Listing, type Tier } from '@/lib/mock-marketplace';
import { useMarketStats } from '@/lib/use-market-stats';
import {
  useActiveListings,
  useListingsVersion,
  type DbListing,
} from '@/lib/supabase-listings';
import { hexCenter } from '@/lib/h3-utils';
import { useHexLocations } from '@/lib/use-hex-locations';
import { classifyTier } from '@/lib/tier';

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
 * Marketplace - minimal, glass-card grid matching the leaderboard / profile vibe.
 * Filters live in a single top row (search · country · tier · sort) instead of a
 * dense side rail; listings render as satellite-preview tiles.
 */
export default function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState<'all' | string>('all');
  const [tier, setTier] = useState<'all' | Tier>('all');
  const [sort, setSort] = useState<SortKey>('newest');

  // Real listings from Supabase, refetched whenever someone lists/cancels.
  const version = useListingsVersion();
  const { listings: dbListings } = useActiveListings(version);
  const dbHexSet = useMemo(
    () => new Set(dbListings.map((l) => l.h3_id)),
    [dbListings],
  );
  const dbLocations = useHexLocations(dbHexSet);
  const realListings = useMemo(
    () => dbListings.map((l) => toListing(l, dbLocations)),
    [dbListings, dbLocations],
  );
  const allListings = realListings;
  const stats = useMarketStats(version);

  const visible = useMemo(() => {
    let xs: ReadonlyArray<Listing> = allListings;

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
  }, [allListings, search, country, tier, sort]);

  const reset = () => {
    setSearch('');
    setCountry('all');
    setTier('all');
    setSort('newest');
  };

  return (
    <div className="mx-auto max-w-7xl xl:max-w-[1500px] 2xl:max-w-[1800px] min-[1920px]:max-w-[2100px] min-[2560px]:max-w-[2400px] px-4 py-6 md:px-8 md:py-8 2xl:px-10">
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
            Buy and sell hexes across VavaWorld
          </p>
        </div>
      </div>

      {/* Stat strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Floor"
          value={stats?.floorSol != null ? `${stats.floorSol.toFixed(3)} SOL` : '—'}
        />
        <Stat
          label="Volume (24h)"
          value={stats ? `${stats.volume24hSol.toFixed(2)} SOL` : '—'}
        />
        <Stat
          label="Listed"
          value={stats ? stats.activeListings.toLocaleString('en-US') : '—'}
        />
        <Stat
          label="Sales (24h)"
          value={stats ? stats.sales24h.toLocaleString('en-US') : '—'}
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
        <CountrySelect
          value={country}
          onChange={setCountry}
          allOption={{ value: 'all', label: 'All countries' }}
          triggerClassName="sm:w-44"
        />
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
            : `Showing ${visible.length} of ${allListings.length.toLocaleString('en-US')}`}
          {realListings.length > 0 && ` · ${realListings.length} live`}
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
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/40 bg-white/30 px-6 py-20 text-center backdrop-blur-md">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <ShoppingBag size={22} strokeWidth={1.6} />
          </div>
          {allListings.length === 0 ? (
            <>
              <p className="text-base font-semibold text-foreground">No hexes listed yet</p>
              <p className="max-w-sm text-sm text-foreground/60">
                The market opens the moment someone lists. Claim land on the map,
                then list it here to be the first seller.
              </p>
              <Link
                href="/map"
                className="mt-1 rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Claim land
              </Link>
            </>
          ) : (
            <p className="max-w-sm text-sm text-foreground/60">
              No listings match these filters. Try widening the search, dropping
              the tier, or picking a different country.
            </p>
          )}
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

/** Adapt a real DB listing into the same Listing shape the grid renders. */
function toListing(
  l: DbListing,
  locations: Map<string, ReturnType<typeof useHexLocations> extends Map<string, infer V> ? V : never>,
): Listing {
  const c = hexCenter(l.h3_id);
  const loc = locations.get(l.h3_id);
  const tier = classifyTier(c.lat, c.lng);
  const price = Number(l.price_sol);
  return {
    id: l.id, // UUID - used as the route segment on /marketplace/[id]
    h3: l.h3_id,
    countryCode: (loc?.countryCode ?? 'un').toLowerCase(),
    city: loc?.place ?? loc?.countryName ?? '-',
    neighborhood: loc?.neighborhood ?? loc?.place ?? '-',
    lat: c.lat,
    lng: c.lng,
    tier,
    price,
    priceUsd: Math.round(price * 150),
    change24h: 0,
    lastSale: null,
    listedAgo: formatAgo(l.listed_at),
    sellerAddr: l.seller,
    claimedAt: l.listed_at,
    claimSequence: 0,
  };
}

function formatAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.floor((Date.now() - then) / 60_000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function rankAgo(s: string): number {
  const n = parseInt(s, 10);
  if (s.includes('m ago')) return n;
  if (s.includes('h ago')) return n * 60;
  if (s.includes('d ago')) return n * 60 * 24;
  return 99999;
}
