# Tomorrowland Tiles — Fas 1 (Lean MVP) Design Spec

**Status:** Draft for review
**Author:** Brainstorm session 2026-05-08
**Scope:** Fas 1 only. Fas 2 (marketplace, customization) and Fas 3 (discovery, polish) explicitly deferred.

---

## 1. Goal

Allow Solana wallet users to claim H3 hex tiles on a satellite map. Each claim costs SOL based on the tile's geographic tier (proximity to a top-100 city dataset). Prices rise via a linear bonding curve as more tiles per tier are sold. Owners can see their tiles in a "My Tiles" view; everyone else can see who owns each claimed tile.

## 2. Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│ Browser (Next.js 14, App Router, single page)               │
│   - Mapbox satellite-v9 + react-map-gl 8                    │
│   - H3 res 9 hex overlay (custom GeoJSON source)            │
│   - Mapbox Geocoding API (search)                           │
│   - Solana wallet adapter (Phantom, Solflare, Backpack)     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ getMultipleAccounts (viewport-batched)
                 │ sendTransaction (claim)
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ Solana RPC (Helius, mainnet/devnet)                         │
└────────────────┬────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│ Anchor program `tiles`                                       │
│   - claim(h3_ids: Vec<u64>, expected_max_total: u64)         │
│   - accounts: Tile (per claimed hex), TierCounter (×3)       │
│   - 100 cities + tier classifier hardcoded as constants      │
│   - SOL transferred from claimer → treasury (hardcoded pk)   │
└─────────────────────────────────────────────────────────────┘
```

Stateless backend. No indexer in Fas 1 — viewport-driven RPC reads handle everything.

## 3. Anchor program (`anchor/programs/tiles`)

### 3.1 Constants (compile-time)

```rust
const TREASURY: Pubkey = pubkey!("...");  // set before deploy

// Pricing in lamports (1 SOL = 1_000_000_000 lamports)
const T1_START: u64 = 20_000_000;       // 0.02 SOL
const T2_START: u64 =  10_000_000;      // 0.01 SOL
const T3_START: u64 =   1_000_000;      // 0.001 SOL
const T1_INCREMENT: u64 =    500_000;   // +0.0005 SOL per sold-in-tier
const T2_INCREMENT: u64 =    100_000;   // +0.0001 SOL
const T3_INCREMENT: u64 =     10_000;   // +0.00001 SOL

// Tier thresholds (km)
const TIER1_RADIUS_KM: u32 = 50;
const TIER2_RADIUS_KM: u32 = 200;

// Top-100 cities — lat/lng as microdegrees (degrees × 1_000_000) i32
const CITIES: [(i32, i32); 100] = [
  (35_689_500, 139_691_700),    // Tokyo
  (28_704_100,  77_102_500),    // Delhi
  // ... 98 more (mirror of frontend lib/cities.ts)
];

// Bulk claim safety
const MAX_TILES_PER_TX: usize = 20;
```

### 3.2 Account types

**`Tile` (PDA, one per claimed hex)**

```rust
#[account]
pub struct Tile {
    pub owner: Pubkey,         // 32
    pub h3_id: u64,            // 8 — the H3 cell index this tile represents
    pub claimed_at: i64,       // 8 — Clock::unix_timestamp at claim
    pub tier: u8,              // 1 — 1 | 2 | 3
    pub price_paid: u64,       // 8 — lamports paid (for receipt/history)
    pub bump: u8,              // 1
}
// Anchor disc 8 + fields 58 = 66 bytes. Rent-exempt minimum ~ 0.00112 SOL.
```

PDA seeds: `["tile", h3_id.to_le_bytes()]`.

**`TierCounter` (PDA, exactly three: one per tier)**

```rust
#[account]
pub struct TierCounter {
    pub tier: u8,              // 1 — 1, 2, or 3
    pub sold: u64,             // 8 — count of tiles sold in this tier
    pub bump: u8,              // 1
}
// Disc 8 + 10 = 18 bytes.
```

PDA seeds: `["counter", tier_byte]`.

Initialization: a separate `init_counter(tier)` instruction, run once per tier as part of program deployment (admin-only via TREASURY signer).

### 3.3 Instructions

**`init_counter(tier: u8)`** — admin-only one-shot.
- Signer must equal TREASURY.
- Creates `TierCounter` PDA for the given tier with `sold = 0`.
- Idempotent: errors if account already exists.

**`claim(h3_ids: Vec<u64>, expected_max_total: u64)`** — main user instruction.

Inputs:
- `h3_ids`: 1..=20 H3 cell IDs to claim. Length validated against `MAX_TILES_PER_TX`.
- `expected_max_total`: lamports the user is willing to spend across the whole batch (slippage protection).

Accounts (Anchor accounts struct):
- `claimer: Signer` — pays SOL.
- `treasury: SystemAccount` — must equal `TREASURY` constant; receives SOL.
- `t1_counter, t2_counter, t3_counter: Account<TierCounter>` — all three loaded mutable; not all are necessarily incremented but all three are needed because each h3_id may classify to any tier.
- `tile_accounts: remaining_accounts` — `h3_ids.len()` writable PDAs in the same order as `h3_ids`. Each must derive correctly via `["tile", h3_id]`. Created (init) inside the loop.

Logic:
```
1. Validate h3_ids.len() in [1, MAX_TILES_PER_TX].
2. For each h3_id:
   a. Verify the corresponding remaining_account is the correct PDA.
   b. Verify the PDA is uninitialized (not double-claim).
   c. Look up H3 center coordinates → tier classification via classify_tier(lat, lng).
   d. counter = match tier { 1 => t1_counter, 2 => t2_counter, 3 => t3_counter }.
   e. price = start[tier] + counter.sold * increment[tier].
   f. running_total += price.
3. require!(running_total <= expected_max_total, SlippageExceeded).
4. CPI: system_program::transfer(claimer → treasury, running_total).
5. For each h3_id (second pass):
   a. Initialize Tile PDA with owner=claimer, h3_id, tier, claimed_at=now, price_paid=price, bump.
   b. Increment matching counter.sold by 1.
```

Two-pass design: first pass computes tier and price (read-only for counters); second pass mutates. Allows the slippage check before any state change.

**Cost note:** ~10–30K compute units per tile (haversine ×100 cities is the heavy part). At 20 tiles → 200–600K CU, well under the 1.4M default limit. If we hit limits we add a `set_compute_unit_limit` ix from frontend.

### 3.4 Tier classification

Reuses the existing JS logic semantics, ported to Rust:

```rust
fn h3_to_latlng(h3: u64) -> (i32, i32) {
    // CPI to a hypothetical h3 program is NOT viable — Anchor program
    // must derive coordinates locally. Use h3-rs crate (rust port of h3-js v4).
    // Returns microdegrees.
}

fn classify_tier(lat: i32, lng: i32) -> u8 {
    let mut min_dist_km = u32::MAX;
    for (clat, clng) in CITIES.iter() {
        let d = haversine_km(lat, lng, *clat, *clng);
        if d < min_dist_km { min_dist_km = d; }
        if min_dist_km < TIER1_RADIUS_KM { return 1; }
    }
    if min_dist_km < TIER2_RADIUS_KM { return 2; }
    3
}
```

Implementation detail (resolved in plan): Solana programs are `no_std`. Haversine needs `sin/cos/sqrt/asin`. Use the `libm` crate (no_std float math) — standard pattern for math-heavy Solana programs. The `h3-rs` crate or a manual port of `cellToLatLng` provides H3-to-coordinates.

### 3.5 Errors

```rust
#[error_code]
pub enum TilesError {
    #[msg("h3_ids length out of range [1,20]")]
    BatchSizeInvalid,
    #[msg("Tile already claimed")]
    AlreadyClaimed,
    #[msg("Treasury account mismatch")]
    TreasuryMismatch,
    #[msg("Total cost exceeds expected_max_total (slippage)")]
    SlippageExceeded,
    #[msg("Counter PDA mismatch for tier")]
    CounterMismatch,
}
```

## 4. Frontend

### 4.1 New components / files

```
app/page.tsx                       (modify: add SearchBar, swap Sidebar tabs)
components/SearchBar.tsx           (new — top-left, autocomplete, fly-to)
components/Sidebar.tsx             (modify: tabs "Selection" / "My Tiles")
components/SelectionPanel.tsx      (new — shows selected hexes, claim button)
components/MyTilesPanel.tsx        (new — list of user's tiles, fly-to per row)
components/MapView.tsx             (modify: bulk-selection state, claim layer, ownership color)
components/ClaimModal.tsx          (new — confirm prices, signing state, success)
lib/anchor-client.ts               (new — typed Anchor client wrapper)
lib/anchor-idl.json                (new — generated by `anchor build`, committed)
lib/tile-pda.ts                    (new — derive tile + counter PDAs)
lib/owner-color.ts                 (new — deterministic color from pubkey)
lib/geocoding.ts                   (new — Mapbox Geocoding API wrapper)
lib/use-tiles.ts                   (new — React hook: fetch claimed tiles for viewport)
lib/use-counters.ts                (new — React hook: fetch live tier counters for pricing)
types/tile.ts                      (modify: add ClaimedTile = Tile + h3 + ownerPubkey)
```

### 4.2 Search flow

`SearchBar` (top-left, fixed, ~320px wide):
- `<input>` with placeholder "Sök adress eller plats..."
- Debounced 200ms → `lib/geocoding.ts` calls `https://api.mapbox.com/geocoding/v5/mapbox.places/{q}.json?access_token=...&limit=5`
- Dropdown: 5 results, each with place name + region. Keyboard nav (↑/↓/Enter).
- Selecting a result calls `mapRef.current?.flyTo({ center: [lng, lat], zoom: 14, duration: 1500 })`.
- Esc clears.

Token reuse: `NEXT_PUBLIC_MAPBOX_TOKEN` already set; geocoding works on the same token.

### 4.3 Hex rendering with ownership

Two layers added to MapView's existing source:
- `h3-grid-fill` (existing, tier-colored, 0.25 opacity) — shows tier for unclaimed hexes
- `h3-grid-claimed` (new, owner-colored, 0.55 opacity) — overlays where account exists

Ownership color: `lib/owner-color.ts` derives a deterministic HSL from `pubkey` bytes (e.g. `hash(pubkey) % 360` for hue, fixed S/L). This avoids needing a registry.

Data flow per `moveend`:
1. `hexesForBounds(bbox)` → list of H3 ids visible.
2. Derive Tile PDAs for each via `lib/tile-pda.ts`.
3. `getMultipleAccounts(pdas)` in batches of 100.
4. Existing accounts → decode via Anchor → mark hex as claimed with owner color.
5. Update GeoJSON source data with `tier` + `claimed: bool` + `owner` properties.

Caching: keep a `Map<h3_id, ClaimedTile | null>` to avoid re-fetching unchanged hexes during pan. Invalidate after a successful claim transaction.

### 4.4 Selection (single + bulk)

Two interaction modes share the same `selectedHexes: Set<string>` state:
- **Single click** on a hex → replaces selection with just that hex.
- **Shift+click** on a hex → toggle in/out of selection (bulk add).
- **Ctrl+drag** rectangle on the map → all hexes whose centers fall in the box are added (toggled if all already selected).

Implementation note: Mapbox default Shift+drag = box-zoom. Disable it via `map.boxZoom.disable()` and use Ctrl+drag for our box-select. Implement the box-select with a transparent canvas overlay element listening to `mousedown`/`mousemove`/`mouseup` on the map container; on release, query rendered features in the box via `queryRenderedFeatures(bbox, { layers: [FILL_LAYER] })`.

Selected hexes get a 4th layer with bright outline (`#fff`, 2.5px) overriding both fill layers.

`SelectionPanel` (sidebar tab "Selection"):
- Shows count: "5 tiles selected"
- Per tile (mini-rows, scrollable): h3 short, tier badge, current price, ✕ to remove
- Subtotal at bottom (live updated using current counters)
- "Claim N tiles" primary button → opens `ClaimModal`

If a selected hex becomes claimed (someone else races us), it's marked unavailable in the list — user must remove it before claiming.

### 4.5 Claim flow

`ClaimModal`:
1. **Review** state — table of {tile, tier, price}, total in SOL, "Confirm" button.
2. **Signing** state — calls `anchor.methods.claim(h3Ids, expectedMaxTotal).accounts(...).remainingAccounts(...).rpc()`. `expectedMaxTotal` = current quoted total × 1.02 (2% slippage tolerance). Spinner.
3. **Confirmed** state — green check, "View on Solscan" link, "Done" button.
4. **Failed** state — error from program (decode `TilesError`), "Retry" or "Cancel".

After confirmed: clear `selectedHexes`, refresh the cached tiles for the affected H3 ids, refresh counters.

### 4.6 My Tiles view

`MyTilesPanel` (sidebar tab "My Tiles", visible only when wallet connected):
- On open: `getProgramAccounts(programId, { filters: [{ memcmp: { offset: 8, bytes: walletPubkey.toBase58() } }] })`
  - Anchor `Tile` discriminator at offset 0–7, then `owner` Pubkey at offset 8–39.
  - This is one RPC call per profile load. Acceptable.
- List of tiles: each row shows h3 short, tier badge, claimed-at date, price paid, "Fly to" button.
- Empty state: "Du har inte claimat några tiles än."

### 4.7 Sidebar tabs

```
[ Selection ] [ My Tiles (12) ]
```

`My Tiles` tab is disabled (greyed) when wallet is not connected.

## 5. State management

No Redux/Zustand needed. Local React state:
- `MapView` owns `selectedHexes: Set<string>` and `tiles: Map<string, ClaimedTile|null>` (cached).
- Lift to `app/page.tsx` so `Sidebar` can read both.
- `useCounters()` hook subscribes to a websocket (`@solana/web3.js` `Connection.onAccountChange`) on each TierCounter PDA to keep prices live across multiple browsers.

## 6. Network and deployment

**Devnet first:**
1. Install Rust + Solana CLI + Anchor 0.30.
2. `solana-keygen new` → keypair becomes TREASURY for devnet.
3. `anchor build` → real program ID generated, write to `Anchor.toml` and `declare_id!`.
4. `solana airdrop 5 --url devnet`.
5. `anchor deploy --provider.cluster devnet`.
6. Run `init_counter(1)`, `init_counter(2)`, `init_counter(3)` from a deploy script.
7. Frontend points at devnet RPC (Helius devnet endpoint or default).

**Mainnet:** repeat with a mainnet keypair as TREASURY (user owns), separate program ID, separate deploy. Frontend env var switches RPC + program ID.

## 7. Testing approach

**Unit (Rust, anchor test):**
- `classify_tier` for known points (Stockholm → 1, mid-Atlantic → 3, point 120km from NYC → 2).
- Bonding curve math (price after N sales).
- Slippage check fails when expected_max_total too low.
- AlreadyClaimed errors on double-claim.
- Batch claim with mixed tiers debits correct total.

**Integration (anchor test, local validator):**
- Full `init_counter` → `claim` flow with multiple keypairs.
- Concurrent claims (two transactions in same block) — counter behavior.

**Frontend (Vitest):**
- `lib/tile-pda.ts` derive correctness (compare with Rust-side test vectors).
- `lib/owner-color.ts` deterministic per pubkey.
- `lib/use-tiles.ts` cache invalidation logic (mock RPC).

**Manual smoke:**
- Devnet: claim single, claim batch of 5, claim batch of 20, attempt 21 (must fail).
- Search → fly-to works for "Stockholm", "Eiffel Tower", "1600 Pennsylvania Ave".
- Drag-rect across viewport, claim all, verify all rendered with owner color.

## 8. Out of scope (Fas 1)

Explicitly NOT building in this phase:
- Marketplace (list/buy/transfer instructions in Anchor program, marketplace UI)
- Tile customization (name, note, image) — Tile account does NOT include these fields
- Royalties (no transfers in Fas 1, so no royalty logic yet)
- Leaderboard, activity feed, heatmap
- Animations, sound effects
- Mobile responsive layout (works on tablet/desktop, mobile breakpoints in Fas 3)
- Geolocation ("min position")
- Image upload per tile
- Off-chain indexer (Helius webhook → Postgres)

## 9. Open questions / decisions deferred to plan

- **TREASURY pubkey**: user must provide a Solana wallet address before deploy. Devnet can use a fresh keypair; mainnet requires user's actual wallet.
- **`h3-rs` vs manual port**: there is no official `h3-rs` crate maintained by Uber; community ports exist but vary in quality. Plan task evaluates options or implements `cellToLatLng` directly (single function, ~80 LOC).
- **Helius vs default RPC**: free Solana RPC has rate limits unsuitable for `getMultipleAccounts` heavy use; Helius devnet free tier likely sufficient. Sign up needed.
- **Search-token usage**: Mapbox public tokens have rate limits; geocoding shares the same token bucket. Acceptable for a single user testing; if traffic grows, add a server-side proxy in Fas 3.

## 10. Acceptance criteria

Fas 1 is "done" when:
1. User connects Phantom/Solflare/Backpack on devnet.
2. User searches "Berlin" → map flies to Berlin.
3. User clicks an unclaimed hex → sidebar shows price (current bonding-curve-computed).
4. User clicks "Claim" → wallet popup → signs → tile appears with owner color within 5 seconds.
5. User shift-clicks 4 more hexes → "Claim 5 tiles" → wallet popup → signs → all 5 appear.
6. User Ctrl-drags a rectangle → adds all hexes in box → claims batch up to 20.
7. User opens "My Tiles" → sees their 6 claimed tiles, can fly-to each.
8. Another user (different wallet, second browser) sees those tiles colored with the first user's color.
9. Counters update across both browsers within ~2 seconds (websocket).
10. Attempting to claim 21 tiles in one tx fails with `BatchSizeInvalid`.
11. Claim transaction with stale `expected_max_total` (someone else claimed in between) fails with `SlippageExceeded`.
