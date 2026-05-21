// Mock marketplace data — replaces real indexer queries until a backend exists.
// Keep shapes close to what we expect from /api/marketplace/* later.

export type Tier = 1 | 2 | 3;

export type Listing = {
  id: string;
  /** Stable hex id we'd route to /marketplace/[id] */
  h3: string;
  countryCode: string;
  city: string;
  neighborhood: string;
  lat: number;
  lng: number;
  tier: Tier;
  /** Asking price in SOL */
  price: number;
  /** Display USD equivalent (no live conversion) */
  priceUsd: number;
  /** % change vs same-tier 24h floor — positive green, negative red */
  change24h: number;
  /** Last sale price for this exact tile (SOL), null if never sold */
  lastSale: number | null;
  /** Decay health %, 0-100 */
  decayPercent: number;
  /** Pre-formatted "X ago" string for UI; ordering is intent, not real time */
  listedAgo: string;
  /** Truncated 0xABCD…7890 seller address */
  sellerAddr: string;
  /** Marker for "auction" status — small share to mix into the table */
  isAuction?: boolean;
  /** Iconic location flag (Eiffel, Statue of Liberty, etc.) */
  isIconic?: boolean;
  /** ISO-8601 UTC timestamp the hex was first claimed on-chain. */
  claimedAt: string;
  /** 1-indexed global claim order — the Nth hex ever claimed. */
  claimSequence: number;
};

import { MOCK_USERS } from './mock-users';

// Index-keyed addresses, kept in sync with MOCK_USERS so any reference to a
// seller/buyer in this file resolves to a real user we can render with the
// shared UserLink (username if present, address otherwise).
const SELLERS = MOCK_USERS.map((u) => u.addr);

// Intentionally varied: rich/poor cities, Tier 1/2/3 mix, mix of price moves
const RAW: Array<Omit<Listing, 'id' | 'priceUsd' | 'sellerAddr' | 'claimedAt' | 'claimSequence'> & { sellerIdx: number }> = [
  { h3: '8b2840a0a0a0001', countryCode: 'se', city: 'Stockholm', neighborhood: 'Östermalm', lat: 59.336, lng: 18.077, tier: 1, price: 0.84, change24h: 12.4, lastSale: 0.72, decayPercent: 85, listedAgo: '2h ago', sellerIdx: 0, isIconic: false },
  { h3: '8b2840a0a0a0002', countryCode: 'jp', city: 'Tokyo', neighborhood: 'Shibuya', lat: 35.659, lng: 139.700, tier: 1, price: 0.92, change24h: 8.1, lastSale: 0.85, decayPercent: 73, listedAgo: '4h ago', sellerIdx: 1, isIconic: true },
  { h3: '8b2840a0a0a0003', countryCode: 'de', city: 'Berlin', neighborhood: 'Kreuzberg', lat: 52.499, lng: 13.403, tier: 2, price: 0.18, change24h: -3.2, lastSale: 0.19, decayPercent: 41, listedAgo: '6h ago', sellerIdx: 2 },
  { h3: '8b2840a0a0a0004', countryCode: 'us', city: 'New York', neighborhood: 'Brooklyn', lat: 40.679, lng: -73.952, tier: 1, price: 0.61, change24h: 22.7, lastSale: 0.50, decayPercent: 76, listedAgo: '12m ago', sellerIdx: 3 },
  { h3: '8b2840a0a0a0005', countryCode: 'fr', city: 'Paris', neighborhood: 'Le Marais', lat: 48.857, lng: 2.359, tier: 1, price: 0.72, change24h: -1.4, lastSale: 0.74, decayPercent: 91, listedAgo: '1h ago', sellerIdx: 4, isIconic: true },
  { h3: '8b2840a0a0a0006', countryCode: 'gb', city: 'London', neighborhood: 'Shoreditch', lat: 51.524, lng: -0.078, tier: 1, price: 0.55, change24h: 5.2, lastSale: 0.52, decayPercent: 62, listedAgo: '8h ago', sellerIdx: 5, isAuction: true },
  { h3: '8b2840a0a0a0007', countryCode: 'br', city: 'São Paulo', neighborhood: 'Vila Madalena', lat: -23.547, lng: -46.690, tier: 2, price: 0.09, change24h: 18.0, lastSale: 0.075, decayPercent: 38, listedAgo: '32m ago', sellerIdx: 6 },
  { h3: '8b2840a0a0a0008', countryCode: 'au', city: 'Sydney', neighborhood: 'Surry Hills', lat: -33.886, lng: 151.211, tier: 1, price: 0.48, change24h: -4.8, lastSale: 0.51, decayPercent: 67, listedAgo: '1d ago', sellerIdx: 7 },
  { h3: '8b2840a0a0a0009', countryCode: 'kr', city: 'Seoul', neighborhood: 'Gangnam', lat: 37.498, lng: 127.027, tier: 1, price: 0.66, change24h: 14.2, lastSale: 0.58, decayPercent: 80, listedAgo: '3h ago', sellerIdx: 8 },
  { h3: '8b2840a0a0a000a', countryCode: 'it', city: 'Rome', neighborhood: 'Trastevere', lat: 41.889, lng: 12.470, tier: 2, price: 0.14, change24h: 2.1, lastSale: 0.13, decayPercent: 55, listedAgo: '5h ago', sellerIdx: 9, isIconic: true },
  { h3: '8b2840a0a0a000b', countryCode: 'pt', city: 'Lisbon', neighborhood: 'Alfama', lat: 38.711, lng: -9.130, tier: 2, price: 0.11, change24h: -7.5, lastSale: 0.12, decayPercent: 23, listedAgo: '9h ago', sellerIdx: 10 },
  { h3: '8b2840a0a0a000c', countryCode: 'nl', city: 'Amsterdam', neighborhood: 'Jordaan', lat: 52.378, lng: 4.880, tier: 1, price: 0.42, change24h: 6.0, lastSale: 0.40, decayPercent: 71, listedAgo: '2h ago', sellerIdx: 11 },
  { h3: '8b2840a0a0a000d', countryCode: 'jp', city: 'Tokyo', neighborhood: 'Shimokitazawa', lat: 35.660, lng: 139.668, tier: 2, price: 0.21, change24h: 9.3, lastSale: 0.18, decayPercent: 49, listedAgo: '47m ago', sellerIdx: 0 },
  { h3: '8b2840a0a0a000e', countryCode: 'us', city: 'Los Angeles', neighborhood: 'Venice', lat: 33.985, lng: -118.469, tier: 1, price: 0.79, change24h: -2.0, lastSale: 0.81, decayPercent: 84, listedAgo: '15h ago', sellerIdx: 1, isIconic: true },
  { h3: '8b2840a0a0a000f', countryCode: 'mx', city: 'Mexico City', neighborhood: 'Roma Norte', lat: 19.418, lng: -99.165, tier: 2, price: 0.07, change24h: 33.3, lastSale: 0.05, decayPercent: 28, listedAgo: '4m ago', sellerIdx: 2 },
  { h3: '8b2840a0a0a0010', countryCode: 'sg', city: 'Singapore', neighborhood: 'Tiong Bahru', lat: 1.286, lng: 103.832, tier: 2, price: 0.13, change24h: -1.2, lastSale: 0.13, decayPercent: 52, listedAgo: '7h ago', sellerIdx: 3 },
  { h3: '8b2840a0a0a0011', countryCode: 'ca', city: 'Toronto', neighborhood: 'Kensington', lat: 43.654, lng: -79.401, tier: 2, price: 0.09, change24h: 4.7, lastSale: 0.08, decayPercent: 44, listedAgo: '11h ago', sellerIdx: 4 },
  { h3: '8b2840a0a0a0012', countryCode: 'es', city: 'Barcelona', neighborhood: 'Gràcia', lat: 41.402, lng: 2.155, tier: 1, price: 0.34, change24h: 11.5, lastSale: 0.30, decayPercent: 69, listedAgo: '40m ago', sellerIdx: 5 },
  { h3: '8b2840a0a0a0013', countryCode: 'tr', city: 'Istanbul', neighborhood: 'Karaköy', lat: 41.024, lng: 28.974, tier: 2, price: 0.06, change24h: -10.4, lastSale: 0.07, decayPercent: 19, listedAgo: '1d ago', sellerIdx: 6 },
  { h3: '8b2840a0a0a0014', countryCode: 'is', city: 'Reykjavík', neighborhood: 'Miðborg', lat: 64.146, lng: -21.942, tier: 3, price: 0.004, change24h: 0, lastSale: null, decayPercent: 12, listedAgo: '3d ago', sellerIdx: 7 },
];

// Deterministic claim-time generator. SSR and CSR must agree so we don't
// flash a different timestamp on hydration. Same input → same output.
// We seed a synthetic global "claim sequence" so each listing shows a unique
// stable Nth-claimed-ever number; the timestamp walks backward from a fixed
// frozen "now" so the most recent rows are minutes-old and older rows are
// weeks/months old, matching the listedAgo strings already used in the UI.
const FROZEN_NOW_MS = Date.parse('2026-05-21T18:30:00Z');

function makeClaimMeta(counter: number): { claimedAt: string; claimSequence: number } {
  // Pseudo-random but deterministic from counter — gives each tile a unique
  // sequence in the 1..50_000 range and a backwards-walking timestamp.
  const seqJitter = ((counter * 2654435761) >>> 0) % 1000;
  const claimSequence = counter * 379 + 11_421 + seqJitter;
  // Walk back in minutes — newer counters = more recent.
  const minutesAgo = counter * 47 + (seqJitter % 360);
  const claimedAt = new Date(FROZEN_NOW_MS - minutesAgo * 60_000).toISOString();
  return { claimedAt, claimSequence };
}

// Build the rest by replicating + permuting so we hit ~50 with varied prices.
function buildListings(): Listing[] {
  const out: Listing[] = [];
  let counter = 0;
  // Original 20
  for (const r of RAW) {
    counter += 1;
    out.push({
      ...r,
      id: String(counter).padStart(2, '0'),
      sellerAddr: SELLERS[r.sellerIdx % SELLERS.length],
      priceUsd: Math.round(r.price * 150),
      ...makeClaimMeta(counter),
    });
  }
  // 30 more derived rows — shift price by tier and rotate cities
  while (counter < 50) {
    const base = RAW[counter % RAW.length];
    counter += 1;
    const priceMultiplier = base.tier === 1 ? 0.85 + Math.random() * 0.4 : base.tier === 2 ? 0.7 + Math.random() * 0.6 : 0.5 + Math.random() * 0.8;
    const change = (Math.random() * 30 - 12);  // -12..18
    const decay = Math.floor(Math.random() * 95) + 5;
    const agoMins = Math.floor(Math.random() * 1440);
    const ago = agoMins < 60 ? `${agoMins}m ago` : agoMins < 1440 ? `${Math.floor(agoMins / 60)}h ago` : `${Math.floor(agoMins / 1440)}d ago`;
    const newPrice = Math.max(0.001, +(base.price * priceMultiplier).toFixed(3));
    out.push({
      ...base,
      id: String(counter).padStart(2, '0'),
      h3: `8b2840a0a0a${(0x100 + counter).toString(16).slice(-3)}`,
      price: newPrice,
      priceUsd: Math.round(newPrice * 150),
      change24h: +change.toFixed(1),
      decayPercent: decay,
      listedAgo: ago,
      sellerAddr: SELLERS[(counter + 3) % SELLERS.length],
      lastSale: base.lastSale != null ? +(base.lastSale * (0.9 + Math.random() * 0.3)).toFixed(3) : null,
      ...makeClaimMeta(counter),
    });
  }
  return out;
}

export const mockListings: ReadonlyArray<Listing> = buildListings();

// ──────────────────────────────────────────────────────────
// Activity feed (recent sales)
// ──────────────────────────────────────────────────────────

export type ActivityItem = {
  id: string;
  countryCode: string;
  city: string;
  neighborhood: string;
  fromAddr: string;
  toAddr: string;
  price: number;
  /** Pre-formatted "X" relative time (no unit needed for UI) */
  ago: string;
  /** Event type — every on-chain sale is both a buy and a sell; we tag
   *  the row from the perspective most interesting in the feed. */
  action: 'buy' | 'sell';
};

const ACT_BASE: Array<Omit<ActivityItem, 'id' | 'fromAddr' | 'toAddr' | 'ago' | 'action'> & { agoMin: number }> = [
  { countryCode: 'jp', city: 'Tokyo', neighborhood: 'Shibuya', price: 0.92, agoMin: 2 },
  { countryCode: 'fr', city: 'Paris', neighborhood: 'Le Marais', price: 0.72, agoMin: 5 },
  { countryCode: 'us', city: 'New York', neighborhood: 'Brooklyn', price: 0.61, agoMin: 8 },
  { countryCode: 'se', city: 'Stockholm', neighborhood: 'Södermalm', price: 0.48, agoMin: 14 },
  { countryCode: 'de', city: 'Berlin', neighborhood: 'Mitte', price: 0.32, agoMin: 22 },
  { countryCode: 'kr', city: 'Seoul', neighborhood: 'Hongdae', price: 0.55, agoMin: 31 },
  { countryCode: 'br', city: 'São Paulo', neighborhood: 'Pinheiros', price: 0.08, agoMin: 38 },
  { countryCode: 'pt', city: 'Lisbon', neighborhood: 'Bairro Alto', price: 0.11, agoMin: 47 },
  { countryCode: 'it', city: 'Rome', neighborhood: 'Trastevere', price: 0.14, agoMin: 56 },
  { countryCode: 'au', city: 'Sydney', neighborhood: 'Bondi', price: 0.42, agoMin: 64 },
  { countryCode: 'gb', city: 'London', neighborhood: 'Shoreditch', price: 0.55, agoMin: 79 },
  { countryCode: 'es', city: 'Barcelona', neighborhood: 'Gràcia', price: 0.31, agoMin: 88 },
  { countryCode: 'nl', city: 'Amsterdam', neighborhood: 'De Pijp', price: 0.39, agoMin: 102 },
  { countryCode: 'mx', city: 'Mexico City', neighborhood: 'Condesa', price: 0.06, agoMin: 121 },
  { countryCode: 'ca', city: 'Toronto', neighborhood: 'Queen West', price: 0.10, agoMin: 137 },
  { countryCode: 'sg', city: 'Singapore', neighborhood: 'Tiong Bahru', price: 0.13, agoMin: 154 },
  { countryCode: 'jp', city: 'Tokyo', neighborhood: 'Nakameguro', price: 0.78, agoMin: 175 },
  { countryCode: 'us', city: 'Los Angeles', neighborhood: 'Silver Lake', price: 0.68, agoMin: 196 },
  { countryCode: 'fr', city: 'Paris', neighborhood: 'Saint-Germain', price: 0.81, agoMin: 222 },
  { countryCode: 'de', city: 'Berlin', neighborhood: 'Neukölln', price: 0.16, agoMin: 248 },
  { countryCode: 'is', city: 'Reykjavík', neighborhood: 'Miðborg', price: 0.005, agoMin: 280 },
  { countryCode: 'tr', city: 'Istanbul', neighborhood: 'Beyoğlu', price: 0.07, agoMin: 314 },
  { countryCode: 'no', city: 'Oslo', neighborhood: 'Grünerløkka', price: 0.22, agoMin: 358 },
  { countryCode: 'fi', city: 'Helsinki', neighborhood: 'Punavuori', price: 0.19, agoMin: 401 },
  { countryCode: 'dk', city: 'Copenhagen', neighborhood: 'Nørrebro', price: 0.27, agoMin: 442 },
  { countryCode: 'hk', city: 'Hong Kong', neighborhood: 'Sheung Wan', price: 0.51, agoMin: 488 },
  { countryCode: 'ie', city: 'Dublin', neighborhood: 'Temple Bar', price: 0.18, agoMin: 521 },
  { countryCode: 'cz', city: 'Prague', neighborhood: 'Žižkov', price: 0.09, agoMin: 567 },
  { countryCode: 'th', city: 'Bangkok', neighborhood: 'Sukhumvit', price: 0.12, agoMin: 612 },
  { countryCode: 'ar', city: 'Buenos Aires', neighborhood: 'Palermo', price: 0.05, agoMin: 668 },
];

function fmtAgo(min: number): string {
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.floor(min / 60)}h`;
  return `${Math.floor(min / 1440)}d`;
}

export const mockActivity: ReadonlyArray<ActivityItem> = ACT_BASE.map((b, i) => ({
  ...b,
  id: `act-${i}`,
  fromAddr: SELLERS[i % SELLERS.length],
  toAddr: SELLERS[(i + 4) % SELLERS.length],
  ago: fmtAgo(b.agoMin),
  // Deterministic alternation so SSR matches CSR — no random per render.
  action: i % 2 === 0 ? 'buy' : 'sell',
}));

// ──────────────────────────────────────────────────────────
// Top-line market stats (header bar)
// ──────────────────────────────────────────────────────────

export const mockMarketStats = {
  floor: 0.018,
  volume24h: 47.2,
  listedCount: 2847,
  sales24h: 184,
} as const;

// ──────────────────────────────────────────────────────────
// Country counts (for the country-filter dropdown — derived
// from a fictional larger pool, not just our 50 listings)
// ──────────────────────────────────────────────────────────

export type CountryCount = { code: string; name: string; count: number };

export const mockCountryCounts: ReadonlyArray<CountryCount> = [
  { code: 'us', name: 'United States', count: 891 },
  { code: 'jp', name: 'Japan', count: 312 },
  { code: 'de', name: 'Germany', count: 128 },
  { code: 'gb', name: 'United Kingdom', count: 116 },
  { code: 'fr', name: 'France', count: 98 },
  { code: 'kr', name: 'South Korea', count: 84 },
  { code: 'au', name: 'Australia', count: 73 },
  { code: 'br', name: 'Brazil', count: 67 },
  { code: 'ca', name: 'Canada', count: 61 },
  { code: 'it', name: 'Italy', count: 58 },
  { code: 'es', name: 'Spain', count: 54 },
  { code: 'nl', name: 'Netherlands', count: 49 },
  { code: 'se', name: 'Sweden', count: 47 },
  { code: 'mx', name: 'Mexico', count: 41 },
  { code: 'sg', name: 'Singapore', count: 38 },
  { code: 'pt', name: 'Portugal', count: 32 },
  { code: 'tr', name: 'Turkey', count: 28 },
  { code: 'no', name: 'Norway', count: 24 },
  { code: 'fi', name: 'Finland', count: 22 },
  { code: 'dk', name: 'Denmark', count: 20 },
  { code: 'hk', name: 'Hong Kong', count: 18 },
  { code: 'ie', name: 'Ireland', count: 16 },
  { code: 'cz', name: 'Czechia', count: 14 },
  { code: 'th', name: 'Thailand', count: 12 },
  { code: 'ar', name: 'Argentina', count: 9 },
  { code: 'is', name: 'Iceland', count: 4 },
];

// Tier counts (for the Tier filter group)
export const mockTierCounts: Record<Tier, number> = {
  1: 412,
  2: 1247,
  3: 1188,
};

// Quick chip counts (top of main content, above the table)
export const mockChipCounts = {
  buyNow: 2847,
  auctions: 23,
  new24h: 184,
  priceDrop: 47,
  endingSoon: 12,
  whaleWatch: 3,
} as const;
