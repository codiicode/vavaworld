# Tomorrowland Tiles

Full-screen Mapbox satellite map with an H3 resolution-10 hex overlay, Solana wallet connect, and a per-tile claim sidebar. Empty Anchor `tiles` program is scaffolded under `/anchor`.

## Stack

- Next.js 14 (App Router) · TypeScript · Tailwind
- Mapbox GL + react-map-gl (v8, imported via `react-map-gl/mapbox`)
- h3-js (resolution 10)
- @solana/web3.js + wallet-adapter (Phantom, Solflare; Backpack via Wallet Standard auto-detection)
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

A hex's tier is computed from its center's haversine distance to the nearest of the hardcoded large-city dataset (`lib/cities.ts`):

- **Tier 1** — within 50 km — amber
- **Tier 2** — within 200 km — teal
- **Tier 3** — beyond 200 km — gray

## Performance note: H3 viewport rendering

The hex grid targets resolution 10, but `lib/h3-utils.ts` clamps the resolution down at zoomed-out viewports — at world view, res 10 would be tens of millions of cells. Tweak `estimateSafeRes` thresholds if you want a different curve.

## Anchor program

The `anchor/` workspace is a parallel Cargo workspace, not part of the Next build. To build the program you'll need [Anchor 0.30+](https://www.anchor-lang.com/docs/installation):

```bash
cd anchor
anchor build
```

The current `tiles` program is empty — instructions and accounts will be added later. The placeholder program ID in `Anchor.toml` and `lib.rs` (`Tiles11111111111111111111111111111111111111`) will be regenerated as a real keypair on first build.
