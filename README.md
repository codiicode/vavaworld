# VAVA

vavaworld.fun · $VAVA

Full-screen Mapbox satellite map with an H3 resolution-9 hex overlay where users claim tiles by paying SOL. Anchor program with bonding-curve pricing per tier (T1 city / T2 suburb / T3 remote), live tier counters via websocket subscription, in-app marketplace planned for Fas 2.

## Stack

- Next.js 14 (App Router) · TypeScript · Tailwind
- Mapbox GL + react-map-gl 8 (imported via `react-map-gl/mapbox`), satellite-v9 style
- h3-js 4 (resolution 9, ~201 m hex edge)
- @solana/web3.js + wallet-adapter (Phantom, Solflare; Backpack via Wallet Standard auto-detection)
- Anchor 1.0.2 program at `anchor/programs/tiles` (deployed on devnet)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Get a Mapbox token**
   - https://account.mapbox.com/access-tokens/ — copy your default public `pk.` token
   - Copy `.env.local.example` to `.env.local`, paste your token

3. **Run dev server**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

4. **Connect a Solana wallet** (Phantom recommended) on **devnet**: Phantom → Settings → Developer Settings → Testnet Mode → Solana Devnet. Get devnet SOL via https://faucet.solana.com.

## Scripts

- `npm run dev` — Next dev server
- `npm run build` — production build
- `npm test` — Vitest unit tests
- `npm run lint` — ESLint

## Project layout

```
app/                Next.js App Router page
components/         MapView, Sidebar, SearchBar, ClaimModal, WalletProviders, ...
lib/                anchor-client, tile-pda, owner-color, quote, geocoding, use-tiles, use-counters, ...
types/              SelectedTile, ClaimedTile
anchor/             Cargo workspace — programs/tiles + scripts/init-counters.mjs
```

## Tier & pricing (Fas 1)

Tier is geographic — haversine distance from the hex centroid to the nearest of 102 hardcoded large cities (`lib/cities.ts`, mirrored in `anchor/programs/tiles/src/constants.rs`):

- **T1** ≤ 50 km from a city — start 0.02 SOL, +0.0005 per sold-in-tier
- **T2** ≤ 200 km — start 0.01 SOL, +0.0001 per sold-in-tier
- **T3** beyond — start 0.001 SOL, +0.00001 per sold-in-tier

Bulk claim up to 20 tiles per transaction with 2% slippage tolerance. Out of scope for Fas 1: marketplace, tile customization (name/note/image), royalties, leaderboard, animations, mobile-responsive.

## Anchor program

The `anchor/` workspace is a parallel Cargo workspace, not part of the Next build. Toolchain: Rust + Solana CLI (Agave 3.x) + Anchor CLI 1.0.

```bash
cd anchor
anchor build
anchor program deploy --provider.cluster devnet
node scripts/init-counters.mjs   # one-time per deploy: initialize T1/T2/T3 counter PDAs
```

Program ID (devnet): `GNfEEPYES1k2sZnoBfWbA51zYZVSyeB46te6EyL8CzBt`
