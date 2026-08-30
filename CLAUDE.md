# VAVA / vavaworld.fun / $VAVA

Tile-claiming Solana dApp. Full-screen Mapbox satellite map, H3 res-12 hex
overlay (~9 m edge). Users claim tiles by paying SOL; planned $VAVA SPL
token used for bonding (locked-up VAVA per claim).

**H3 resolution is 12 site-wide and is the claim contract** — `lib/h3-utils.ts`
`HEX_RES=12`, `lib/pricing.ts` `H3_RESOLUTION:12`, and `/api/claim` +
`/api/hex-floor` reject any hex that isn't res 12. Never lower it. The map only
*renders* the grid at zoom ≥ 16 (a res-12 cell is sub-pixel below that); it does
not coarsen the rendered cells, so a clicked cell is always the claimable cell.

**Repo:** `C:\Users\User\Desktop\tomorrowland`
**Live:** https://vavaworld.fun (alias of https://vavaworld.vercel.app)

## How the user works with you

- **Respond in Swedish.** All conversation, status updates, commit subjects
  in English (industry norm), code/comments in English.
- **No Claude co-author trailer in commits.** Single-author commits only.
- **Build → screenshot/HTML-verify → commit → deploy → alias → live-verify
  → report.** Don't ship without confirming the change is actually visible
  live. The user has caught regressions before because of this.
- **Don't ask multi-choice planning questions for small changes.** Make the
  reasonable call and ship. Surface anything load-bearing in the final
  Swedish summary so they can redirect.
- The user is moving fast and iterating on UX. Optimize for visible progress
  per turn.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript strict, React 18 |
| Styling | Tailwind + shadcn/ui (Radix primitives in `components/ui/`) |
| Map | Mapbox GL + `react-map-gl/mapbox` v8, satellite-v9 style |
| Geo | h3-js 4 (resolution 12) |
| Chain | Solana **devnet**, Anchor 1.0.2 program at `anchor/programs/tiles` |
| Wallet | Privy (`@privy-io/react-auth`) embedded wallet + Phantom/Solflare/Backpack via wallet-adapter |
| Off-chain data | Supabase (`@supabase/supabase-js`) — profiles, claim_hex pricing fn, etc. |
| Icons | lucide-react |
| Tests | Vitest (`lib/__tests__/`) |
| Deploy | Vercel (`vavaworld` project, owner `leo-jankovics-projects`) |

`vercel.json` pins `installCommand: "npm install --legacy-peer-deps"` —
respect that when reproducing installs locally.

## Routes (all under `app/(app)/`)

| Path | Purpose |
|---|---|
| `/` | Landing page: single full-screen video hero, nothing below it (`components/landing/VideoHero.tsx`, styles `app/hero.css`; the nav + wallet actions live inside VideoHero) |
| `/map` | Full-bleed Mapbox map. Right panel = `glass-right-panel.tsx`. Map sidebar = global `AppSidebar` |
| `/marketplace` | Hex listings table + filter sidebar. Detail at `/marketplace/[id]` |
| `/activity` | Site-wide live buy/sell feed (matches /leaderboard styling) |
| `/leaderboard` | Top holders. Filters: hexes / bonded / volume / value / countries |
| `/profile` | YOUR profile (reads connected wallet via `useUserProfile`) |
| `/u/[handle]` | Public profile for ANY user. Resolves username OR address. Renders stub for unknown handles so links never 404 |
| `/portfolio` | Standalone full-bleed page (own sidebar `PfSidebar`, NOT shared `AppSidebar`). Detected via `isStandalone` in `app/(app)/layout.tsx` |
| `/nations` + `/nations/[iso]` | Country pages (no Cabinet section — removed; President kept) |
| `/api/claim` `/api/countries` `/api/hex-floor` | Server routes |

## Design system

- **Background:** shared `public/sky-bg.jpg` rendered by `app/(app)/layout.tsx`. Every (app) page inherits it. The /portfolio page used to layer a `filter: saturate()` + gradient overlay + glowing orbs — that's been REMOVED so the background is pixel-identical across pages. **Don't re-introduce per-page sky effects.**
- **Glass cards:** `rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md`. This is the single canonical recipe — reuse it.
- **Headings:** 3xl semibold tracking-tight; eyebrow above heading is `text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60`.
- **Sidebar wordmark** font is `StretchPro` (self-hosted at `public/fonts/StretchPro.otf`, declared in `app/globals.css`). Landing wordmark is 15px, app sidebar wordmark is 11px white. The font fallback chain is `"StretchPro", "Abril Fatface", Georgia, serif`.
- **Logo:** `public/logga transparent.png` (white transparent). Used globally via `components/brand-logo.tsx`. No backgrounds.
- **Flags:** Always use the `<Flag>` SVG component (`components/flag.tsx`). **Never emoji flags** — they break on Windows.
- **App sidebar:** `components/layout/app-sidebar.tsx` is the SOURCE OF TRUTH for nav items + icons. The standalone `/portfolio` page has its own `PfSidebar` that MUST mirror it 1:1 (same lucide icons, same labels). Order: Map / Portfolio / Profile / Marketplace / Nations / Activity / Leaderboard. The portfolio nav icon is `BarChart3`, NOT a briefcase.

## Conventions

- **Token name:** Always `$VAVA` site-wide (never bare "VAVA token"). Title in `app/layout.tsx` is `$VAVA`.
- **User references:** Show `@username` when set, fall back to wallet address. Always a link to `/u/[handle]`. Use `<UserLink addr={...} username={...} />` from `components/user-link.tsx`. Single source of truth for mock users is `lib/mock-users.ts` (`MOCK_USERS`); `mock-marketplace.ts` derives `SELLERS` from it.
- **Mock data:** `lib/mock-leaderboard.ts`, `lib/mock-marketplace.ts`, `lib/mock-nations.ts`, `lib/mock-users.ts`. Most UI is mock-driven today; real data lands when the indexer ships.
- **Pricing & settlement:** Primary claims are PRICED by the per-country USD curve (Supabase claim_count) but SETTLED on-chain: /api/quote signs (claimer, h3s, prices, expiry) with the keeper key (`KEEPER_SECRET_KEY`), the client sends [ed25519-verify, claim] via `lib/claim-chain.ts` (chunks of 10), the program splits 85/15 (treasury/buyback escrow) and creates Tile PDAs, then /api/claim mirrors to Supabase via its PDA-verified mirror path. The program REJECTS unquoted prices - never bypass /api/quote.
- **Bids (escrowed on-chain):** Offers on claimed hexes lock the SOL in a `BidEscrow` PDA (`place_bid`); `accept_bid` splits 95/5 (97/3 baron) + flips the tile atomically, `decline_bid`/`cancel_bid` auto-refund. Client txs in `lib/bid-chain.ts`, DB mirror via /api/bids + /api/bids/respond (server verifies chain state - escrow PDA / tile owner - no signed messages). Listing buys stay wallet-transfer settled but the server runs keeper `sync_owner` after, so on-chain tile.owner always tracks the real owner - REQUIRED for accept_bid's has_one check. Smoke: `smoke-bid-escrow.mjs` (chain) + `smoke-bids-api.mjs` (E2E).
- **Comments:** Don't write WHAT comments. Only WHY when non-obvious (constraint, invariant, workaround). No "added for X" / "used by Y" references — those rot.

## On-chain (`anchor/programs/tiles`)

- Program ID (devnet): `G8MsXTtabmQnfPd4PZ7dDLYtRPhFDqRs93ExhhsSDkwM`
- `constants.rs`:
  - `MAX_TILES_PER_TX = 20` on-chain; the client chunks at 10 (`CLAIM_CHUNK` in lib/claim-chain.ts, matching /api/quote's MAX_PER_QUOTE) - large selections become N sequential quote+tx rounds in ClaimModal.
  - Pricing tiers T1/T2/T3 with bonding-curve increments.
  - 102 cities table for the on-chain tier classifier (integer bbox, not haversine).
- Compute budget limit ~1.4M CU + TX size 1232 B means a single claim can realistically never exceed ~25–40 tiles regardless of program changes.

## Environment vars (`.env.local`)

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk....
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_PROGRAM_ID=G8MsXTtabmQnfPd4PZ7dDLYtRPhFDqRs93ExhhsSDkwM
NEXT_PUBLIC_TREASURY=<devnet wallet>
NEXT_PUBLIC_PRIVY_APP_ID=<privy id>
NEXT_PUBLIC_SUPABASE_URL=<supabase project url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

`.env.local.example` has the public ones; Supabase keys aren't checked in.

## Deploy flow (memorize this)

**The repo deploys to BOTH Vercel and Railway from the same `main`.** Railway
setup + env vars are documented in `docs/railway-deploy.md` (two services: the
Next.js app, and the keeper buyback bot via `railway.keeper.json`). Keep the
app host-agnostic: no `@vercel/*` runtime APIs, `npm start` must honour `$PORT`,
and installs rely on `.npmrc` rather than a Vercel-only install command.

Vercel auto-deploys `main` from GitHub (`codiicode/vavaworld`). Pushing IS
the deploy — there is no manual CLI step, no alias step:

```bash
# 1. Deploy
git push origin main

# 2. Verify live (production alias updates itself)
curl -fsS https://vavaworld.vercel.app/<route> | grep <some-string-you-just-changed>
```

**Never ship with `npx vercel --prod`.** A CLI deploy bypasses git, so the
next push to `main` silently reverts it. That is how the 2026-06 split
happened: 144 commits of landing work existed only as CLI deploys while
GitHub's `main` kept putting the other version back into production.
Recovered in `31f2cd8`; both histories are kept as `archive/local-main-2b94263`
and `archive/github-main-bf4fe48`.

Instant Rollback in the Vercel UI only reaches the newest production deploys
— older ones report "a newer deployment exists" and cannot be promoted. The
fix for a bad production build is always a commit on `main`, never the UI.

Project name on Vercel: `vavaworld` (owner `leo-jankovics-projects`). Custom domain `vavaworld.fun` aliases to the same.

## Local dev

```bash
npm install --legacy-peer-deps     # vercel.json pins this
npm run dev                        # localhost:3000
npm run build                      # full type-check + lint
npm test                           # vitest, hits lib/__tests__
```

For headless screenshot verification before deploy: write a temp `.shot.js`
using CDP (Chrome at `C:/Program Files/Google/Chrome/Application/chrome.exe`)
INSIDE the project dir so `require('ws')` resolves from `node_modules`.
Clean up `.shot.js` + `.*.png` before committing.

## Frequent gotchas

- **Tailwind opacity modifiers must be multiples of 5.** `text-white/52` silently never compiles (no CSS emitted) → the element inherits the theme `--foreground` color, which is dark in light mode. On the always-dark /map chrome this makes text invisible in light mode only. Use /50, /55 etc. Sweep check: `grep -rhoE "-[a-z]+/[0-9]+" components app | awk -F/ '$2 % 5 != 0'`.
- **/map chrome (sidebar, right panel, search bar) is ALWAYS dark glass** in both themes — never style anything on it with `text-foreground`/theme vars; use fixed white. Verify /map changes in BOTH themes AND with hexes selected (pricing card + mark-closest + rows is the tallest state; the Claim CTA must stay visible).
- **Edit tool requires Read first** in the same session — Read the file before editing or the edit fails.
- **`next start` on a busy port** → `EADDRINUSE`. Kill via PowerShell:
  `Get-NetTCPConnection -LocalPort <p> | % { Stop-Process -Id $_.OwningProcess -Force }`
- **Emoji flags break on Windows** → always `<Flag code="se" />`.
- **`/fast` mode is OFF by default** — user opted out (billed at premium $30/$150 per Mtok, outside the subscription). Don't toggle it on.
- **/portfolio is standalone** — don't add the global `AppSidebar` there; it gets `isStandalone` treatment in `app/(app)/layout.tsx` and renders its own `PfSidebar`. When changing sidebars, change BOTH so they stay 1:1.
- **Mock vs on-chain:** When you raise a UI cap (like the map's 20→1000 claim cap), check whether on-chain enforces it independently and surface the mismatch to the user.

## Working in parallel with multiple Claude windows

The user runs multiple Claude Code windows. To stay out of each other's way:

```bash
# From the main repo:
git worktree add ../tomorrowland-<feature> <branch-name>
```

Then launch a Claude Code session in `../tomorrowland-<feature>`. Both
windows read this CLAUDE.md + the user's auto-memory, but edit isolated
working trees. Existing worktree dir: `.claude/worktrees`.

## What lives where

- `app/` — routes (App Router). `(app)/` is the auth-gated group with shared layout.
- `components/` — feature folders (`map/`, `marketplace/`, `leaderboard/`, `nations/`, `profile/`, `landing/`) + global ones at top level (`brand-logo`, `flag`, `user-link`, `ClaimModal`, etc.) + `ui/` for shadcn primitives.
- `lib/hex-grid.worker.ts` — Web Worker that builds the /map hex grid (polygonToCells + boundaries + tier, 40-90ms CPU) off the main thread. MapView posts a bbox, receives the finished FeatureCollection. Keep heavy per-viewport geometry work HERE, not in MapView.
- `lib/` — utilities, hooks (`use-*.ts`), Solana client wiring (`anchor-client.ts`, `anchor-idl.json`, `tile-pda.ts`), Supabase clients (`supabase.ts` client / `supabase-server.ts` server), pricing/quote logic, mock datasets, geo helpers (`h3-utils`, `cities`, `geocoding`, `tier`).
- `anchor/programs/tiles/` — on-chain Rust program.
- `docs/superpowers/` — house docs.
- `public/` — static assets (logo, sky bg, fonts, etc.).
- `types/` — global TS type augments.
