# Deploying VAVAWORLD on Railway

Everything the backend needs runs from this one repo. There is no separate
API server: the `/api/*` routes are Next.js route handlers inside the same
app, so deploying the app deploys the backend.

Two Railway services, both pointing at `github.com/codiicode/vavaworld`:

| Service | Config file | Start command | What it is |
|---|---|---|---|
| **web** | `railway.json` (default) | `npm start` | Next.js app + all 21 `/api/*` routes |
| **keeper** | `railway.keeper.json` | `npm run keeper` | Buyback bot: converts escrowed SOL into embedded $VAVA |

The repo is already prepared for this: `.npmrc` pins `legacy-peer-deps`,
`package.json` pins Node `>=22.11.0`, `npm start` binds to Railway's injected
`$PORT`, and `sharp` is installed (self-hosted Next.js needs it for
`next/image`; Vercel used to provide it).

---

## 1. Web service

New Project → Deploy from GitHub repo → select `codiicode/vavaworld`.
Nixpacks auto-detects Next.js and uses `railway.json`. Then add the
environment variables below.

### Environment variables

Public (safe to expose, baked into the browser bundle at build time):

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Mapbox account |
| `NEXT_PUBLIC_RPC_URL` | Solana RPC (devnet public today; use a paid Helius endpoint on mainnet) |
| `NEXT_PUBLIC_PROGRAM_ID` | On-chain program id — see `lib/anchor-idl.json` → `address` |
| `NEXT_PUBLIC_TREASURY` | Treasury wallet address |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Privy dashboard |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings |
| `NEXT_PUBLIC_MAPILLARY_TOKEN` | Mapillary (street view) |

Secret (server-only — never prefix these with `NEXT_PUBLIC_`):

| Variable | What it does |
|---|---|
| `KEEPER_SECRET_KEY` | base58 secret key. Signs primary-claim price quotes in `/api/quote`. **If this leaks, anyone can price land themselves** — the on-chain program trusts whatever this key signs. |
| `INDEXER_API_SECRET` | Gates the Supabase `claim_hex` function so the DB can't be driven with the public anon key. |
| `PRIVY_APP_SECRET` | Server-side Privy token verification (X account verification). |

Current values live in the Vercel project (`vercel env pull` with access, or
copy from the dashboard). Copy them across; don't regenerate `KEEPER_SECRET_KEY`
without also running `update_keeper` on-chain — the program checks the quote
signature against the key stored in its config.

### Region

Set the service region to **EU West** (Settings → Regions, or
`railway service scale --service vavaworld eu-west=1`). Supabase is in
`eu-north-1`; a US region puts a transatlantic round trip on every query.
Check for leftover replicas in other regions — they cost double and take
half the traffic.

---

## 2. Keeper service

Add a second service from the same repo, then set **Config Path** to
`railway.keeper.json` in the service settings.

| Variable | Required | Notes |
|---|---|---|
| `KEEPER_SECRET_KEY` | yes | Same key as the web service. Signs `embed()`. |
| `KEEPER_INTERVAL_SECS` | yes | e.g. `60`. Without it the process runs one pass and exits (Railway would treat that as a crash and restart-loop). |
| `RPC_URL` | recommended | Falls back to `NEXT_PUBLIC_RPC_URL`, then devnet public. |
| `SOL_PRICE_URL` | recommended | Point at the deployed web service, e.g. `https://<web>.up.railway.app/api/sol-price`. Falls back to $105 if unreachable. |
| `VAVA_REFERENCE_USD` | devnet only | Fixed price used to size the "buy" in reference mode. Defaults to `0.0001`. |
| `FUNDER_SECRET_KEY` | **devnet only** | Tops the keeper up with SOL + test-$VAVA. **Leave unset in production** — the keeper should be funded deliberately, and this key can move treasury funds. |
| `KEEPER_SWAP` | mainnet | `reference` (default; devnet fixed-price credit) or `jupiter` (real SOL→$VAVA buy via Jupiter Order/Execute before each embed pass). |
| `JUPITER_API_KEY` | optional | Keyless api.jup.ag access is 0.5 RPS — enough for one pass a minute. Set a key from Jupiter Portal for headroom. |
| `JUPITER_BASE_URL` | optional | Defaults to `https://api.jup.ag/swap/v2`. |
| `KEEPER_MIN_SWAP_LAMPORTS` | optional | Skip a pass when total pending SOL is below this (default 1 000 000 = 0.001 SOL) so fee drag never eats dust. |

The keeper reads the $VAVA mint from the on-chain config on every pass, so
launch day's `update_mint` flows through without redeploying it.

### Mainnet swap mode

`KEEPER_SWAP=jupiter` makes each pass do ONE swap for the pass's total
pending SOL (Jupiter `/order` → sign → `/execute`), then split the received
$VAVA pro-rata across tiles by their pending lamports before calling
`embed()` per tile. The keeper still fronts the SOL and is reimbursed by
`embed`, so it needs working capital ≥ the largest expected pass. Swap
math and error paths are unit-tested in `lib/__tests__/keeper-swap.test.ts`;
the swap client lives in `anchor/scripts/keeper-swap.mjs`. Jupiter only has
liquidity on mainnet — the mode cannot be rehearsed on devnet, so keep
`reference` there.

---

## 2a. Solana payment rail (SOL / USDC)

"Pay there, settle here." Off by default; nothing changes for users until
both web-service variables below are set - no deploy needed to switch on.

| Variable | Service | Notes |
|---|---|---|
| `NEXT_PUBLIC_SOLANA_PAY` | web | `1` to show SOL/USDC in every Pay-with picker (claim, buy, bid). |
| `NEXT_PUBLIC_SOLANA_TREASURY` | web | Solana address that receives payments. Both this and the flag must be set. |
| `SOLANA_RPC_URL` | web | Server-side RPC used to verify payments (finalized). Paid endpoint recommended. |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | web | Browser RPC for building the transfer. |
| `NEXT_PUBLIC_SOLANA_CLUSTER` | web | `mainnet` (default) or `devnet` for rehearsal. |
| `INDEXER_API_SECRET` | keeper | Same value as the web service - authorises the keeper's sweep call. |

Flow: `/api/quote` (or `/api/foreign-quote` for buy/bid) prices the action in
SOL/USDC at the live rate +1% and opens a `foreign_payments` row. The user
pays the treasury from the Privy Solana embedded wallet with the payment id
in the memo. `/api/solana-pay` verifies the finalized transfer (recipient,
amount, memo, signature never used before) and the web service's keeper key
funds the payer's EVM wallet with the ETH the action needs plus gas. The
user's own wallet then runs claim / buy / placeBid exactly like an ETH payer.
The keeper calls `/api/solana-pay/sweep` each pass to re-drive any verified
payment whose funding never landed.

**Working capital:** the keeper key pays out ETH on every Solana purchase and
the treasury accumulates SOL/USDC on Solana - rebalance SOL -> ETH on
Robinhood Chain periodically and keep the keeper's ETH float above the
largest expected purchase.

## 2b. If deploys sit at NEEDS_APPROVAL

Railway can flag pushes as coming from an "external contributor" and hold
every deployment behind a manual Deploy button, even when the commit author
is the repo owner. Reconnecting the source from the CLI (authenticated as the
workspace owner) clears it:

```bash
railway service source connect --repo codiicode/vavaworld --branch main --service vavaworld
```

After that, pushes to `main` build automatically. Verify with an empty commit:
`git commit --allow-empty -m "test" && git push` — the service status should
go to `BUILDING`, not `NEEDS_APPROVAL`.

## 3. The one real regression vs Vercel: CDN caching

Seven API routes set `s-maxage` / `stale-while-revalidate` headers. On Vercel
those were served by the edge CDN — measured ~100 ms under load with the
origin seeing roughly one request per cache window. Railway has no CDN, so
every request hits the container and the database.

**Fix:** put Cloudflare (free tier) in front of the Railway domain. It honours
the same headers, so the caching behaviour returns with no code changes. The
routes that depend on it:

`/api/hex-floor` · `/api/country-count` · `/api/countries` · `/api/claimed`
`/api/sol-price` · `/api/leaderboard` · `/api/market-stats`

Without a CDN the site works fine at low traffic; it degrades under load
exactly where the load test previously showed 0 errors at 60 concurrent users.

---

## 4. Other differences from Vercel

- **Cron.** `vercel.json`'s `crons` block is ignored by Railway. The only job
  there is `/api/keepalive` (daily, to stop Supabase's free tier pausing) —
  recreate it as a Railway cron, or drop it once Supabase is on a paid plan.
- **Region.** `vercel.json` pinned `arn1` (Stockholm) because Supabase lives in
  `eu-north-1`. Deploy the Railway services in an EU region for the same
  reason; a US region adds a transatlantic round trip to every DB query.
- **Speed Insights.** `@vercel/speed-insights` silently stops collecting off
  Vercel. Harmless, but swap it for something else if you want field data.
- **Image optimization.** Handled by `sharp` in-process now. It works, but it
  is CPU on your container rather than Vercel's edge.

---

## 5. Verify after deploying

```bash
BASE=https://<your-service>.up.railway.app

curl -s $BASE/api/sol-price                       # {"solUsd":...}
curl -s "$BASE/api/hex-floor?h3=8c1f1d48860e9ff"  # floor + country
curl -s $BASE/api/claimed | head -c 200           # claimed registry
curl -sI $BASE/ | head -1                         # 200
```

Then in a browser: the map loads and flies to the Eiffel Tower, clicking a hex
prices it, and login opens the Privy modal. Quote signing is the thing most
likely to be misconfigured — if `/api/quote` returns
`{"error":"quote signing not configured"}`, `KEEPER_SECRET_KEY` is missing.

## 6. Local development

```bash
npm install          # .npmrc handles the peer-dep flag
npm run dev          # localhost:3000
npm run build        # full type-check + lint
npm test             # vitest
npm run keeper       # one-shot buyback pass
```

`.env.local` holds the same variables as the table above. Keypair files
(`anchor/keeper-keypair.json`, `~/.config/solana/id.json`) work as a local
fallback when the env vars are not set — that fallback never triggers on
Railway, where only the env vars exist.
