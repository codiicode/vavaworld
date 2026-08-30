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
`package.json` pins Node `>=20.9.0`, `npm start` binds to Railway's injected
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

### Health check

`railway.json` points the health check at `/api/sol-price`. It is cheap and
touches no secrets, so a failing check means the app itself is down.

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
| `VAVA_REFERENCE_USD` | devnet only | Fixed price used to size the "buy". Defaults to `0.0001`. On mainnet this leg becomes a real Jupiter swap — see below. |
| `FUNDER_SECRET_KEY` | **devnet only** | Tops the keeper up with SOL + test-$VAVA. **Leave unset in production** — the keeper should be funded deliberately, and this key can move treasury funds. |

The keeper reads the $VAVA mint from the on-chain config on every pass, so
launch day's `update_mint` flows through without redeploying it.

### Not done yet: the mainnet swap leg

On devnet the keeper credits tokens at a fixed reference price because there
is no market. On mainnet it must actually buy $VAVA (Jupiter) with the
reimbursed SOL before calling `embed()`. That swap is the one piece of the
buyback loop still to be written.

---

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
