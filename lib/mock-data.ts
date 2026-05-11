// TODO: replace with real indexer endpoints when they're built.
// Keeping shape close to what `/api/portfolio`, `/api/activity`, and
// `/api/portfolio/history` will likely return.

export type MockTile = {
  id: string;
  city: string;
  neighborhood: string;
  country: string; // ISO 3166-1 alpha-2
  tier: 1 | 2 | 3;
  claimedAt: string; // ISO date
  decayPercent: number; // 0-100, higher = healthier
  floor: number; // SOL
  lat: number;
  lng: number;
};

export const mockTiles: MockTile[] = [
  { id: '01', city: 'Stockholm', neighborhood: 'Östermalm', country: 'SE', tier: 1, claimedAt: '2026-03-14', decayPercent: 85, floor: 0.84, lat: 59.336, lng: 18.077 },
  { id: '02', city: 'Tokyo', neighborhood: 'Shibuya', country: 'JP', tier: 1, claimedAt: '2026-03-12', decayPercent: 72, floor: 0.92, lat: 35.659, lng: 139.700 },
  { id: '03', city: 'Berlin', neighborhood: 'Kreuzberg', country: 'DE', tier: 2, claimedAt: '2026-03-10', decayPercent: 41, floor: 0.18, lat: 52.499, lng: 13.403 },
  { id: '04', city: 'New York', neighborhood: 'Brooklyn', country: 'US', tier: 1, claimedAt: '2026-03-08', decayPercent: 76, floor: 0.61, lat: 40.679, lng: -73.952 },
  { id: '05', city: 'Lisbon', neighborhood: 'Alfama', country: 'PT', tier: 2, claimedAt: '2026-03-03', decayPercent: 23, floor: 0.09, lat: 38.711, lng: -9.130 },
  { id: '06', city: 'Paris', neighborhood: 'Le Marais', country: 'FR', tier: 1, claimedAt: '2026-02-28', decayPercent: 91, floor: 0.72, lat: 48.857, lng: 2.359 },
  { id: '07', city: 'Reykjavík', neighborhood: 'Miðborg', country: 'IS', tier: 3, claimedAt: '2026-02-21', decayPercent: 55, floor: 0.004, lat: 64.146, lng: -21.942 },
  { id: '08', city: 'Sydney', neighborhood: 'Surry Hills', country: 'AU', tier: 1, claimedAt: '2026-02-18', decayPercent: 67, floor: 0.48, lat: -33.886, lng: 151.211 },
  { id: '09', city: 'Singapore', neighborhood: 'Tiong Bahru', country: 'SG', tier: 2, claimedAt: '2026-02-11', decayPercent: 18, floor: 0.13, lat: 1.286, lng: 103.832 },
  { id: '10', city: 'Mexico City', neighborhood: 'Roma Norte', country: 'MX', tier: 2, claimedAt: '2026-02-05', decayPercent: 49, floor: 0.07, lat: 19.418, lng: -99.165 },
];

export type MockActivity = {
  id: string;
  type: 'claim' | 'sale' | 'yield' | 'decay';
  description: string;
  detail: string | null;
  timestamp: string;
};

export const mockActivity: MockActivity[] = [
  { id: 'e1', type: 'claim', description: 'Claimed Paris · Le Marais', detail: null, timestamp: '2h ago' },
  { id: 'e2', type: 'sale', description: 'Sold Berlin · Mitte', detail: '0.3 SOL', timestamp: '8h ago' },
  { id: 'e3', type: 'yield', description: 'Yield received', detail: '4.2 SOL', timestamp: '1d ago' },
  { id: 'e4', type: 'decay', description: 'Decay reset on 12 tiles', detail: null, timestamp: '2d ago' },
  { id: 'e5', type: 'claim', description: 'Claimed Tokyo · Shibuya', detail: null, timestamp: '3d ago' },
  { id: 'e6', type: 'sale', description: 'Listed NYC · Brooklyn', detail: '1.2 SOL', timestamp: '4d ago' },
  { id: 'e7', type: 'yield', description: 'Yield received', detail: '2.8 SOL', timestamp: '5d ago' },
  { id: 'e8', type: 'claim', description: 'Claimed Lisbon · Alfama', detail: null, timestamp: '1w ago' },
];

export type PortfolioHistoryPoint = { date: string; value: number };

// 30 points growing from ~5 SOL to 12.84 SOL with realistic jitter.
export const mockPortfolioHistory: PortfolioHistoryPoint[] = (() => {
  const out: PortfolioHistoryPoint[] = [];
  const start = new Date('2026-04-12');
  const startValue = 5.0;
  const endValue = 12.84;
  for (let i = 0; i < 30; i++) {
    const d = new Date(start.getTime() + i * 24 * 3600 * 1000);
    const t = i / 29;
    // Easing + jitter (deterministic via sine so the chart is stable across refreshes)
    const base = startValue + (endValue - startValue) * (1 - Math.cos(t * Math.PI)) / 2;
    const jitter = Math.sin(i * 1.7) * 0.35;
    out.push({ date: d.toISOString().slice(0, 10), value: Number((base + jitter).toFixed(2)) });
  }
  return out;
})();
