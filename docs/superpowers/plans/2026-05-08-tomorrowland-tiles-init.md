# Tomorrowland Tiles — Initial Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap a Next.js 14 (App Router, TS, Tailwind) Mapbox + Solana app that renders a viewport-aware H3 resolution-10 hex grid over satellite-streets-v12, classifies hexes by proximity to a top-100 city list (tiers 1/2/3), supports wallet connect, and exposes a Claim sidebar — alongside an empty Anchor `tiles` program scaffold.

**Architecture:**
- Next.js App Router with a single full-screen client-rendered map page. `react-map-gl` handles Mapbox lifecycle; a custom `addLayer({ type: 'fill' })` plus a GeoJSON source supplies the H3 hex overlay, regenerated on `moveend` from the current viewport bounds.
- Solana wallet state lives in a top-level provider tree (`ConnectionProvider` → `WalletProvider` → `WalletModalProvider`) wrapped around the app. Anchor program is a parallel `/anchor` Cargo workspace, not part of the Next build.
- Tier calculation is a pure function over `(lat, lng) → 1 | 2 | 3` using haversine distance to a hardcoded top-100 city list — testable without the map.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Mapbox GL · react-map-gl · h3-js · @solana/web3.js · @solana/wallet-adapter-* · @coral-xyz/anchor · Anchor 0.30 (Rust)

**Working directory:** `C:\Users\User\Desktop\tomorrowland`

---

## File Structure

**Created by `create-next-app` (do not hand-write):**
- `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `next-env.d.ts`, `.gitignore`, `.eslintrc.json`

**Hand-authored Next.js files:**
- `app/layout.tsx` — modified: dark theme `<html className="dark">`, no shadows, app metadata
- `app/globals.css` — modified: dark base palette, mapbox css import, full-bleed body
- `app/page.tsx` — replaced: client-side map page composition (renders `WalletProviders`, `MapView`, `Sidebar`, `WalletButton`)
- `components/WalletProviders.tsx` — Solana provider tree (Phantom, Solflare, Backpack)
- `components/WalletButton.tsx` — top-right wrapper around `WalletMultiButton`
- `components/MapView.tsx` — Mapbox map, H3 overlay layer, click handling, selection state lift
- `components/Sidebar.tsx` — right sidebar showing wallet, selected tile, Claim button
- `lib/cities.ts` — top-100 cities array `{ name, lat, lng }`
- `lib/tier.ts` — pure tier classification function
- `lib/h3-utils.ts` — viewport → hex set, hex → GeoJSON polygon
- `lib/__tests__/tier.test.ts` — Vitest unit tests for tier logic
- `lib/__tests__/h3-utils.test.ts` — Vitest unit tests for hex helpers
- `types/tile.ts` — `SelectedTile` type
- `.env.local.example` — `NEXT_PUBLIC_MAPBOX_TOKEN=`
- `README.md` — setup, Mapbox token instructions, run commands
- `vitest.config.ts` — minimal Vitest config

**Anchor workspace (separate Cargo workspace):**
- `anchor/Anchor.toml`
- `anchor/Cargo.toml` (workspace root)
- `anchor/programs/tiles/Cargo.toml`
- `anchor/programs/tiles/Xargo.toml`
- `anchor/programs/tiles/src/lib.rs` (empty `#[program]` module)
- `anchor/tests/.gitkeep`
- `anchor/migrations/.gitkeep`

---

## Task 1: Initialize Next.js project

**Files:**
- Create: full Next.js 14 scaffold in `C:\Users\User\Desktop\tomorrowland\`

- [ ] **Step 1: Run create-next-app**

```bash
cd "C:/Users/User/Desktop/tomorrowland"
npx --yes create-next-app@14 . --ts --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm --no-turbo
```

Answer "Yes" to any "directory not empty" prompt only if it lists exactly `docs/`. Otherwise abort and inspect.

- [ ] **Step 2: Verify scaffold**

Run:
```bash
ls "C:/Users/User/Desktop/tomorrowland"
```
Expected to include: `app/`, `package.json`, `tailwind.config.ts`, `tsconfig.json`, `next.config.mjs`.

- [ ] **Step 3: Init git and first commit**

```bash
cd "C:/Users/User/Desktop/tomorrowland"
git init
git add -A
git commit -m "chore: initial create-next-app scaffold"
```

---

## Task 2: Install runtime dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install map + h3 + solana + anchor deps**

```bash
cd "C:/Users/User/Desktop/tomorrowland"
npm install mapbox-gl react-map-gl h3-js @solana/web3.js @solana/wallet-adapter-react @solana/wallet-adapter-react-ui @solana/wallet-adapter-wallets @coral-xyz/anchor
npm install -D @types/mapbox-gl vitest @vitest/ui
```

- [ ] **Step 2: Verify install**

```bash
npm ls mapbox-gl react-map-gl h3-js @solana/wallet-adapter-react
```
Expected: each listed at a resolved version, no `UNMET` warnings.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add map, h3, solana, anchor dependencies"
```

---

## Task 3: Configure dark theme + global styles

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Replace `app/globals.css`**

```css
@import 'mapbox-gl/dist/mapbox-gl.css';
@import '@solana/wallet-adapter-react-ui/styles.css';

@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #0b0d10;
  --panel: #14171c;
  --border: #232830;
  --fg: #e6e8eb;
  --muted: #8a8f98;
  --amber: #f4a02633;
  --teal: #14b8a633;
  --gray: #6b727a26;
}

html, body { height: 100%; }
body {
  background: var(--bg);
  color: var(--fg);
  font-family: ui-sans-serif, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

* { box-shadow: none !important; }

.mapboxgl-ctrl-attrib, .mapboxgl-ctrl-logo { opacity: 0.4; }
```

- [ ] **Step 2: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tomorrowland Tiles',
  description: 'Claim a tile on the world.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[var(--bg)] text-[var(--fg)]">{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Update `tailwind.config.ts` to enable class-based dark mode**

Replace its `export default` with:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0d10',
        panel: '#14171c',
        border: '#232830',
        fg: '#e6e8eb',
        muted: '#8a8f98',
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx tailwind.config.ts
git commit -m "feat: dark theme base styles, no shadows, mapbox + wallet css"
```

---

## Task 4: Top-100 cities dataset

**Files:**
- Create: `lib/cities.ts`

- [ ] **Step 1: Create `lib/cities.ts` with the 100-city list**

```ts
export type City = { name: string; lat: number; lng: number };

// Top-100 cities by population (approximate, rounded to 4 decimals).
// Source: UN World Urbanization Prospects 2018 + Demographia 2023.
export const TOP_100_CITIES: City[] = [
  { name: 'Tokyo', lat: 35.6895, lng: 139.6917 },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025 },
  { name: 'Shanghai', lat: 31.2304, lng: 121.4737 },
  { name: 'São Paulo', lat: -23.5505, lng: -46.6333 },
  { name: 'Mexico City', lat: 19.4326, lng: -99.1332 },
  { name: 'Cairo', lat: 30.0444, lng: 31.2357 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { name: 'Beijing', lat: 39.9042, lng: 116.4074 },
  { name: 'Dhaka', lat: 23.8103, lng: 90.4125 },
  { name: 'Osaka', lat: 34.6937, lng: 135.5023 },
  { name: 'New York', lat: 40.7128, lng: -74.0060 },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011 },
  { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
  { name: 'Chongqing', lat: 29.4316, lng: 106.9123 },
  { name: 'Istanbul', lat: 41.0082, lng: 28.9784 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { name: 'Manila', lat: 14.5995, lng: 120.9842 },
  { name: 'Lagos', lat: 6.5244, lng: 3.3792 },
  { name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729 },
  { name: 'Tianjin', lat: 39.3434, lng: 117.3616 },
  { name: 'Kinshasa', lat: -4.4419, lng: 15.2663 },
  { name: 'Guangzhou', lat: 23.1291, lng: 113.2644 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437 },
  { name: 'Moscow', lat: 55.7558, lng: 37.6173 },
  { name: 'Shenzhen', lat: 22.5431, lng: 114.0579 },
  { name: 'Lahore', lat: 31.5497, lng: 74.3436 },
  { name: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'Bogotá', lat: 4.7110, lng: -74.0721 },
  { name: 'Jakarta', lat: -6.2088, lng: 106.8456 },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { name: 'Lima', lat: -12.0464, lng: -77.0428 },
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018 },
  { name: 'Seoul', lat: 37.5665, lng: 126.9780 },
  { name: 'Nagoya', lat: 35.1815, lng: 136.9066 },
  { name: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Tehran', lat: 35.6892, lng: 51.3890 },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298 },
  { name: 'Chengdu', lat: 30.5728, lng: 104.0668 },
  { name: 'Nanjing', lat: 32.0603, lng: 118.7969 },
  { name: 'Wuhan', lat: 30.5928, lng: 114.3055 },
  { name: 'Ho Chi Minh City', lat: 10.8231, lng: 106.6297 },
  { name: 'Luanda', lat: -8.8390, lng: 13.2894 },
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
  { name: 'Kuala Lumpur', lat: 3.1390, lng: 101.6869 },
  { name: 'Xi\'an', lat: 34.3416, lng: 108.9398 },
  { name: 'Hong Kong', lat: 22.3193, lng: 114.1694 },
  { name: 'Dongguan', lat: 23.0489, lng: 113.7447 },
  { name: 'Hangzhou', lat: 30.2741, lng: 120.1551 },
  { name: 'Foshan', lat: 23.0218, lng: 113.1219 },
  { name: 'Shenyang', lat: 41.8057, lng: 123.4315 },
  { name: 'Riyadh', lat: 24.7136, lng: 46.6753 },
  { name: 'Baghdad', lat: 33.3152, lng: 44.3661 },
  { name: 'Santiago', lat: -33.4489, lng: -70.6693 },
  { name: 'Surat', lat: 21.1702, lng: 72.8311 },
  { name: 'Madrid', lat: 40.4168, lng: -3.7038 },
  { name: 'Suzhou', lat: 31.2989, lng: 120.5853 },
  { name: 'Pune', lat: 18.5204, lng: 73.8567 },
  { name: 'Harbin', lat: 45.8038, lng: 126.5350 },
  { name: 'Houston', lat: 29.7604, lng: -95.3698 },
  { name: 'Dallas', lat: 32.7767, lng: -96.7970 },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832 },
  { name: 'Dar es Salaam', lat: -6.7924, lng: 39.2083 },
  { name: 'Miami', lat: 25.7617, lng: -80.1918 },
  { name: 'Belo Horizonte', lat: -19.9167, lng: -43.9345 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Philadelphia', lat: 39.9526, lng: -75.1652 },
  { name: 'Atlanta', lat: 33.7490, lng: -84.3880 },
  { name: 'Fukuoka', lat: 33.5904, lng: 130.4017 },
  { name: 'Khartoum', lat: 15.5007, lng: 32.5599 },
  { name: 'Barcelona', lat: 41.3851, lng: 2.1734 },
  { name: 'Johannesburg', lat: -26.2041, lng: 28.0473 },
  { name: 'Saint Petersburg', lat: 59.9311, lng: 30.3609 },
  { name: 'Qingdao', lat: 36.0671, lng: 120.3826 },
  { name: 'Dalian', lat: 38.9140, lng: 121.6147 },
  { name: 'Washington', lat: 38.9072, lng: -77.0369 },
  { name: 'Yangon', lat: 16.8409, lng: 96.1735 },
  { name: 'Alexandria', lat: 31.2001, lng: 29.9187 },
  { name: 'Jinan', lat: 36.6512, lng: 117.1201 },
  { name: 'Guadalajara', lat: 20.6597, lng: -103.3496 },
  { name: 'Boston', lat: 42.3601, lng: -71.0589 },
  { name: 'Phoenix', lat: 33.4484, lng: -112.0740 },
  { name: 'Nairobi', lat: -1.2921, lng: 36.8219 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093 },
  { name: 'Melbourne', lat: -37.8136, lng: 144.9631 },
  { name: 'Berlin', lat: 52.5200, lng: 13.4050 },
  { name: 'Detroit', lat: 42.3314, lng: -83.0458 },
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  { name: 'Rome', lat: 41.9028, lng: 12.4964 },
  { name: 'Casablanca', lat: 33.5731, lng: -7.5898 },
  { name: 'Athens', lat: 37.9838, lng: 23.7275 },
  { name: 'Vienna', lat: 48.2082, lng: 16.3738 },
  { name: 'Warsaw', lat: 52.2297, lng: 21.0122 },
  { name: 'Montreal', lat: 45.5017, lng: -73.5673 },
  { name: 'Caracas', lat: 10.4806, lng: -66.9036 },
  { name: 'Addis Ababa', lat: 9.0320, lng: 38.7469 },
  { name: 'Hanoi', lat: 21.0285, lng: 105.8542 },
  { name: 'Taipei', lat: 25.0330, lng: 121.5654 },
  { name: 'Tashkent', lat: 41.2995, lng: 69.2401 },
  { name: 'Pyongyang', lat: 39.0392, lng: 125.7625 },
  { name: 'Stockholm', lat: 59.3293, lng: 18.0686 },
];
```

- [ ] **Step 2: Verify count**

```bash
node -e "console.log(require('./lib/cities.ts'.replace('.ts','.js')) ? 'use TS check' : ''); " 2>/dev/null
npx tsc --noEmit
```
Expected: `tsc --noEmit` passes (or first error is unrelated to `cities.ts`).

- [ ] **Step 3: Commit**

```bash
git add lib/cities.ts
git commit -m "feat: add top-100 cities dataset"
```

---

## Task 5: Tier classifier (TDD)

**Files:**
- Create: `lib/tier.ts`
- Create: `lib/__tests__/tier.test.ts`
- Create: `vitest.config.ts`
- Modify: `package.json` (add `test` script)

- [ ] **Step 1: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { environment: 'node', include: ['lib/**/*.test.ts'] },
});
```

Add to `package.json` `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: Write failing tests**

Create `lib/__tests__/tier.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { classifyTier, haversineKm } from '../tier';

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(40.7128, -74.0060, 40.7128, -74.0060)).toBeCloseTo(0, 3);
  });
  it('NYC to LA ~3944 km', () => {
    const d = haversineKm(40.7128, -74.0060, 34.0522, -118.2437);
    expect(d).toBeGreaterThan(3900);
    expect(d).toBeLessThan(4000);
  });
});

describe('classifyTier', () => {
  it('tier 1 inside 50km of NYC', () => {
    expect(classifyTier(40.75, -74.00)).toBe(1);
  });
  it('tier 2 ~120km from NYC (Philadelphia is in dataset, use offshore)', () => {
    expect(classifyTier(41.5, -72.5)).toBe(2);
  });
  it('tier 3 mid-Pacific', () => {
    expect(classifyTier(0, -160)).toBe(3);
  });
});
```

- [ ] **Step 3: Run tests, expect failure**

```bash
npm test
```
Expected: FAIL — module `../tier` not found.

- [ ] **Step 4: Implement `lib/tier.ts`**

```ts
import { TOP_100_CITIES } from './cities';

export type Tier = 1 | 2 | 3;

const R_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

export function classifyTier(lat: number, lng: number): Tier {
  let min = Infinity;
  for (const c of TOP_100_CITIES) {
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < min) min = d;
    if (min < 50) return 1;
  }
  if (min < 50) return 1;
  if (min < 200) return 2;
  return 3;
}

export const TIER_FILL: Record<Tier, string> = {
  1: '#f4a026',
  2: '#14b8a6',
  3: '#6b727a',
};
```

- [ ] **Step 5: Run tests, expect pass**

```bash
npm test
```
Expected: PASS — 5 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/tier.ts lib/__tests__/tier.test.ts vitest.config.ts package.json
git commit -m "feat: tier classifier with haversine distance to top-100 cities"
```

---

## Task 6: H3 viewport + GeoJSON helpers (TDD)

**Files:**
- Create: `lib/h3-utils.ts`
- Create: `lib/__tests__/h3-utils.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/__tests__/h3-utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { hexesForBounds, hexToFeature, HEX_RES } from '../h3-utils';

describe('hexesForBounds', () => {
  it('returns a non-empty set for a small bbox', () => {
    // Manhattan-ish bbox
    const hexes = hexesForBounds([-74.02, 40.70, -73.95, 40.79]);
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes[0]).toMatch(/^[0-9a-f]{15}$/);
  });

  it('caps at safety limit for huge bbox', () => {
    // World — guard against runaway
    const hexes = hexesForBounds([-180, -85, 180, 85]);
    expect(hexes.length).toBeLessThanOrEqual(20000);
  });
});

describe('hexToFeature', () => {
  it('produces a GeoJSON Polygon feature with the h3 id', () => {
    const [hex] = hexesForBounds([-74.0, 40.74, -73.99, 40.75]);
    const f = hexToFeature(hex);
    expect(f.type).toBe('Feature');
    expect(f.geometry.type).toBe('Polygon');
    expect(f.properties?.h3).toBe(hex);
  });
});

describe('HEX_RES', () => {
  it('is resolution 10', () => {
    expect(HEX_RES).toBe(10);
  });
});
```

- [ ] **Step 2: Run, expect fail**

```bash
npm test
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/h3-utils.ts`**

```ts
import { polygonToCells, cellToBoundary, cellToLatLng } from 'h3-js';
import type { Feature, Polygon } from 'geojson';

export const HEX_RES = 10 as const;
const SAFETY_CAP = 20000;

export type Bbox = [west: number, south: number, east: number, north: number];

export function hexesForBounds(bbox: Bbox, res: number = HEX_RES): string[] {
  const [w, s, e, n] = bbox;
  // h3-js v4 polygonToCells expects [lat, lng] vertices, GeoJSON ring closed.
  const ring: [number, number][] = [
    [s, w],
    [s, e],
    [n, e],
    [n, w],
    [s, w],
  ];
  // At res 10 a worldwide box is millions of cells — clamp resolution to keep result tractable.
  const effectiveRes = estimateSafeRes(bbox, res);
  const cells = polygonToCells([ring], effectiveRes);
  return cells.length > SAFETY_CAP ? cells.slice(0, SAFETY_CAP) : cells;
}

function estimateSafeRes(bbox: Bbox, requested: number): number {
  const [w, s, e, n] = bbox;
  const areaDeg = Math.max(0.0001, (e - w) * (n - s));
  // Drop two res levels per ~50x area increase past a small viewport.
  if (areaDeg > 5000) return Math.max(2, requested - 6);
  if (areaDeg > 500) return Math.max(4, requested - 4);
  if (areaDeg > 50) return Math.max(6, requested - 2);
  if (areaDeg > 5) return Math.max(8, requested - 1);
  return requested;
}

export function hexToFeature(h3: string): Feature<Polygon> {
  // cellToBoundary returns [lat, lng]; GeoJSON wants [lng, lat].
  const boundary = cellToBoundary(h3) as [number, number][];
  const coords = boundary.map(([lat, lng]) => [lng, lat]);
  coords.push(coords[0]);
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties: { h3 },
  };
}

export function hexCenter(h3: string): { lat: number; lng: number } {
  const [lat, lng] = cellToLatLng(h3);
  return { lat, lng };
}
```

- [ ] **Step 4: Run, expect pass**

```bash
npm test
```
Expected: PASS — all hex tests + tier tests still green.

- [ ] **Step 5: Commit**

```bash
git add lib/h3-utils.ts lib/__tests__/h3-utils.test.ts
git commit -m "feat: H3 viewport-to-cells and GeoJSON conversion with res clamping"
```

---

## Task 7: Wallet provider tree

**Files:**
- Create: `components/WalletProviders.tsx`
- Create: `components/WalletButton.tsx`

- [ ] **Step 1: Create `components/WalletProviders.tsx`**

```tsx
'use client';

import { useMemo, type ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  BackpackWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

export function WalletProviders({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => clusterApiUrl('mainnet-beta'), []);
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new BackpackWalletAdapter()],
    [],
  );
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
```

- [ ] **Step 2: Create `components/WalletButton.tsx`**

```tsx
'use client';

import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  { ssr: false },
);

export function WalletButton() {
  return (
    <div className="absolute top-4 right-4 z-20">
      <WalletMultiButton />
    </div>
  );
}
```

- [ ] **Step 3: Verify type-check**

```bash
npx tsc --noEmit
```
Expected: no errors in `components/Wallet*.tsx`.

- [ ] **Step 4: Commit**

```bash
git add components/WalletProviders.tsx components/WalletButton.tsx
git commit -m "feat: solana wallet provider tree (Phantom, Solflare, Backpack)"
```

---

## Task 8: Sidebar component

**Files:**
- Create: `types/tile.ts`
- Create: `components/Sidebar.tsx`

- [ ] **Step 1: Create `types/tile.ts`**

```ts
import type { Tier } from '@/lib/tier';

export type SelectedTile = {
  h3: string;
  lat: number;
  lng: number;
  tier: Tier;
};
```

- [ ] **Step 2: Create `components/Sidebar.tsx`**

```tsx
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import type { SelectedTile } from '@/types/tile';

export function Sidebar({ tile }: { tile: SelectedTile | null }) {
  const { publicKey, connected } = useWallet();
  return (
    <aside
      className="absolute right-0 top-0 h-full w-80 border-l border-[var(--border)] bg-[var(--panel)] p-5 z-10 overflow-y-auto"
      style={{ paddingTop: '5rem' }}
    >
      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2">Wallet</h2>
        <p className="font-mono text-sm break-all">
          {connected && publicKey ? publicKey.toBase58() : 'Not connected'}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-[var(--muted)] mb-2">
          Selected tile
        </h2>
        {tile ? (
          <dl className="text-sm space-y-1">
            <div>
              <dt className="text-[var(--muted)] inline">h3 </dt>
              <dd className="font-mono inline">{tile.h3}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)] inline">lat </dt>
              <dd className="font-mono inline">{tile.lat.toFixed(5)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)] inline">lng </dt>
              <dd className="font-mono inline">{tile.lng.toFixed(5)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)] inline">tier </dt>
              <dd className="inline">{tile.tier}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-[var(--muted)] text-sm">Click a hex to select.</p>
        )}
      </section>

      <button
        type="button"
        disabled={!tile || !connected}
        className="w-full py-3 border border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] disabled:opacity-40 hover:border-[var(--fg)] transition-colors"
        onClick={() => console.log('Claim clicked', tile)}
      >
        Claim
      </button>
    </aside>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add types/tile.ts components/Sidebar.tsx
git commit -m "feat: sidebar with wallet, selected tile, claim button"
```

---

## Task 9: MapView with H3 overlay + click handling

**Files:**
- Create: `components/MapView.tsx`

- [ ] **Step 1: Create `components/MapView.tsx`**

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Map, { type MapRef, type MapLayerMouseEvent } from 'react-map-gl';
import type { FeatureCollection, Polygon } from 'geojson';
import { hexCenter, hexToFeature, hexesForBounds } from '@/lib/h3-utils';
import { TIER_FILL, classifyTier } from '@/lib/tier';
import type { SelectedTile } from '@/types/tile';

const SOURCE_ID = 'h3-grid';
const FILL_LAYER = 'h3-grid-fill';
const LINE_LAYER = 'h3-grid-line';
const SELECTED_LAYER = 'h3-grid-selected';

export function MapView({
  onSelect,
  selected,
}: {
  onSelect: (t: SelectedTile) => void;
  selected: SelectedTile | null;
}) {
  const mapRef = useRef<MapRef | null>(null);
  const [ready, setReady] = useState(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const refreshHexes = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const b = map.getBounds();
    if (!b) return;
    const bbox: [number, number, number, number] = [
      b.getWest(),
      b.getSouth(),
      b.getEast(),
      b.getNorth(),
    ];
    const ids = hexesForBounds(bbox);
    const fc: FeatureCollection<Polygon> = {
      type: 'FeatureCollection',
      features: ids.map((id) => {
        const f = hexToFeature(id);
        const c = hexCenter(id);
        f.properties = { ...f.properties, tier: classifyTier(c.lat, c.lng) };
        return f;
      }),
    };
    const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined;
    if (src) src.setData(fc);
  }, []);

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
    map.addLayer({
      id: FILL_LAYER,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': [
          'match',
          ['get', 'tier'],
          1, TIER_FILL[1],
          2, TIER_FILL[2],
          3, TIER_FILL[3],
          TIER_FILL[3],
        ],
        'fill-opacity': 0.25,
      },
    });
    map.addLayer({
      id: LINE_LAYER,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': '#232830', 'line-width': 0.5 },
    });
    map.addLayer({
      id: SELECTED_LAYER,
      type: 'line',
      source: SOURCE_ID,
      paint: { 'line-color': '#e6e8eb', 'line-width': 2 },
      filter: ['==', ['get', 'h3'], ''],
    });
    setReady(true);
    refreshHexes();
  }, [refreshHexes]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.setFilter(SELECTED_LAYER, ['==', ['get', 'h3'], selected?.h3 ?? '']);
  }, [selected, ready]);

  const onClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;
      const feats = map.queryRenderedFeatures(e.point, { layers: [FILL_LAYER] });
      if (!feats.length) return;
      const h3 = feats[0].properties?.h3 as string | undefined;
      if (!h3) return;
      const c = hexCenter(h3);
      const tier = classifyTier(c.lat, c.lng);
      console.log('selected hex', h3);
      onSelect({ h3, lat: c.lat, lng: c.lng, tier });
    },
    [onSelect],
  );

  if (!token) {
    return (
      <div className="h-full w-full grid place-items-center text-[var(--muted)] text-sm">
        Set NEXT_PUBLIC_MAPBOX_TOKEN in .env.local
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={{ longitude: 13.405, latitude: 52.52, zoom: 10 }}
      style={{ position: 'absolute', inset: 0 }}
      mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
      onLoad={onLoad}
      onMoveEnd={refreshHexes}
      onClick={onClick}
      interactiveLayerIds={[FILL_LAYER]}
    />
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/MapView.tsx
git commit -m "feat: mapbox view with H3 overlay, viewport refresh, click selection"
```

---

## Task 10: Compose page

**Files:**
- Modify: `app/page.tsx`
- Create: `.env.local.example`

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { WalletProviders } from '@/components/WalletProviders';
import { WalletButton } from '@/components/WalletButton';
import { MapView } from '@/components/MapView';
import { Sidebar } from '@/components/Sidebar';
import type { SelectedTile } from '@/types/tile';

export default function Page() {
  const [tile, setTile] = useState<SelectedTile | null>(null);
  return (
    <WalletProviders>
      <main className="fixed inset-0">
        <MapView onSelect={setTile} selected={tile} />
        <Sidebar tile={tile} />
        <WalletButton />
      </main>
    </WalletProviders>
  );
}
```

- [ ] **Step 2: Create `.env.local.example`**

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.replace_me
```

- [ ] **Step 3: Add `.env.local` to `.gitignore` (verify present)**

`create-next-app` already adds it; if missing append:
```
.env*.local
```

- [ ] **Step 4: Manual smoke test**

```bash
cp .env.local.example .env.local
# user pastes a real token
npm run dev
```
Open http://localhost:3000 — expect map, hex grid, wallet button top-right, sidebar right. Click a hex → border highlight + h3 logged in browser console.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx .env.local.example .gitignore
git commit -m "feat: compose map page with sidebar and wallet button"
```

---

## Task 11: Anchor `tiles` program scaffold

**Files:**
- Create: `anchor/Anchor.toml`
- Create: `anchor/Cargo.toml`
- Create: `anchor/programs/tiles/Cargo.toml`
- Create: `anchor/programs/tiles/Xargo.toml`
- Create: `anchor/programs/tiles/src/lib.rs`
- Create: `anchor/tests/.gitkeep`
- Create: `anchor/migrations/.gitkeep`

- [ ] **Step 1: Create `anchor/Anchor.toml`**

```toml
[toolchain]
anchor_version = "0.30.1"

[features]
resolution = true
skip-lint = false

[programs.localnet]
tiles = "Tiles11111111111111111111111111111111111111"

[registry]
url = "https://api.apr.dev"

[provider]
cluster = "Localnet"
wallet = "~/.config/solana/id.json"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
```

- [ ] **Step 2: Create `anchor/Cargo.toml`**

```toml
[workspace]
members = ["programs/*"]
resolver = "2"

[profile.release]
overflow-checks = true
lto = "fat"
codegen-units = 1
[profile.release.build-override]
opt-level = 3
incremental = false
codegen-units = 1
```

- [ ] **Step 3: Create `anchor/programs/tiles/Cargo.toml`**

```toml
[package]
name = "tiles"
version = "0.1.0"
description = "Tomorrowland tiles program (scaffold)."
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "tiles"

[features]
default = []
cpi = ["no-entrypoint"]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
idl-build = ["anchor-lang/idl-build"]

[dependencies]
anchor-lang = "0.30.1"
```

- [ ] **Step 4: Create `anchor/programs/tiles/Xargo.toml`**

```toml
[target.bpfel-unknown-unknown.dependencies.std]
features = []
```

- [ ] **Step 5: Create `anchor/programs/tiles/src/lib.rs`**

```rust
use anchor_lang::prelude::*;

declare_id!("Tiles11111111111111111111111111111111111111");

#[program]
pub mod tiles {
    use super::*;
}
```

- [ ] **Step 6: Add placeholders for tests/migrations**

```bash
mkdir -p anchor/tests anchor/migrations
touch anchor/tests/.gitkeep anchor/migrations/.gitkeep
```

- [ ] **Step 7: Commit**

```bash
git add anchor/
git commit -m "chore: scaffold empty anchor 'tiles' program workspace"
```

---

## Task 12: README

**Files:**
- Modify: `README.md` (replace create-next-app default)

- [ ] **Step 1: Replace `README.md`**

```markdown
# Tomorrowland Tiles

Full-screen Mapbox satellite map with an H3 resolution-10 hex overlay, Solana wallet connect, and a per-tile claim sidebar. Empty Anchor `tiles` program is scaffolded under `/anchor`.

## Stack

- Next.js 14 (App Router) · TypeScript · Tailwind
- Mapbox GL + react-map-gl
- h3-js (resolution 10)
- @solana/web3.js + wallet-adapter (Phantom, Solflare, Backpack)
- Anchor 0.30 (Rust) — empty program at `anchor/programs/tiles`

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Get a Mapbox token**
   - Sign up at https://account.mapbox.com/
   - Open https://account.mapbox.com/access-tokens/
   - Either copy your default public token (starts with `pk.`) or click *Create a token*. The default scopes are sufficient.
   - Copy `.env.local.example` to `.env.local` and paste:
     ```
     NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_real_token_here
     ```

3. **Run the dev server**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 — you should see the satellite map, hex grid, wallet button top-right, and sidebar.

## Scripts

- `npm run dev` — Next dev server
- `npm run build` — production build
- `npm test` — Vitest unit tests (tier classifier, h3 helpers)
- `npm run lint` — ESLint

## Project layout

```
app/                Next.js App Router pages
components/         MapView, Sidebar, WalletProviders, WalletButton
lib/                cities.ts, tier.ts, h3-utils.ts (+ tests)
types/              SelectedTile etc.
anchor/             Anchor workspace (empty `tiles` program)
```

## Tier rules

A hex's tier is computed from its center's haversine distance to the nearest of 100 hardcoded large cities (`lib/cities.ts`):

- **Tier 1** — within 50 km — amber
- **Tier 2** — within 200 km — teal
- **Tier 3** — beyond 200 km — gray

## Anchor program

The `anchor/` workspace is a parallel Cargo workspace, not part of the Next build. To build the program you'll need [Anchor 0.30+](https://www.anchor-lang.com/docs/installation):

```bash
cd anchor
anchor build
```

The current `tiles` program is empty — instructions and accounts will be added later.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: setup, mapbox token instructions, project layout, tier rules"
```

---

## Self-Review Notes

- **Spec coverage:** Next.js 14 + TS + Tailwind + App Router (T1, T3) · mapbox-gl, react-map-gl, h3-js, @solana/web3.js, wallet-adapter-react/ui/wallets, @coral-xyz/anchor (T2) · full-screen map at `app/page.tsx` with satellite-streets-v12 + token from env (T9, T10) · H3 res-10 overlay viewport-only via custom source/layer (T6, T9) · click handler highlights and logs h3 (T9) · wallet multi-button top-right (Phantom/Solflare/Backpack) (T7) · right sidebar with wallet/h3/lat-lng/tier/Claim (T8) · tier rules 50/200 km amber/teal/gray (T5, T9) · dark theme, no shadows, clean borders (T3, T8) · `/anchor` workspace with empty `tiles` program (T11) · README with Mapbox token steps (T12). Covered.
- **Placeholder scan:** none. All steps contain final code.
- **Type consistency:** `Tier`, `SelectedTile`, `hexesForBounds`, `hexToFeature`, `hexCenter`, `classifyTier`, `TIER_FILL`, `WalletProviders`, `WalletButton`, `MapView`, `Sidebar` are defined once and referenced consistently.
- **Note on res-10 viewport safety:** at world-view zoom, res-10 cells number in the millions. T6 includes a `estimateSafeRes` clamp that drops resolution at large viewports — the requirement asks for "res 10" but a literal interpretation crashes the browser. Clamp is a pragmatic fix; the user can tighten zoom thresholds in `lib/h3-utils.ts` if desired.
