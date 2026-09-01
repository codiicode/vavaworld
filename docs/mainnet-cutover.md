# Mainnet cutover runbook

Every step that takes VAVAWORLD from devnet to mainnet, in order. Nothing
here is optional; the order matters because the program id and mint feed
into everything downstream.

## 0. Prerequisites

- [ ] Mainnet treasury wallet created on a hardware wallet (this address
      receives 85% of every primary claim — treat the key accordingly).
- [ ] Paid RPC endpoint (Helius or Triton). The public mainnet RPC will
      rate-limit the site into the ground on day one.
- [ ] Keeper funded with working-capital SOL (it fronts each buyback pass
      and is reimbursed by `embed`) plus fee headroom.
- [ ] $VAVA minted (pump.fun, 6 decimals) — record the mint address.
- [ ] Supabase on a paid plan (free tier pauses after inactivity).

## 1. On-chain program

1. Edit `anchor/programs/tiles/src/constants.rs`: replace `TREASURY` with
   the mainnet treasury pubkey.
2. `anchor build` with a fresh mainnet program keypair; note the new
   program id, update `declare_id!` + `Anchor.toml`, rebuild.
3. `anchor deploy --provider.cluster mainnet`.
4. Initialize: `init_config` (keeper pubkey), `init_stake_vault`,
   `init_counter` for tiers 1–3.
5. `update_mint` with the real $VAVA mint, then — once verified —
   `lock_mint` so it can never be swapped again.

## 2. App + env (Railway and Vercel)

| Variable | Change to |
|---|---|
| `NEXT_PUBLIC_RPC_URL` / `RPC_URL` | paid mainnet endpoint |
| `NEXT_PUBLIC_PROGRAM_ID` | new mainnet program id |
| `NEXT_PUBLIC_TREASURY` | mainnet treasury |
| `KEEPER_SECRET_KEY` | mainnet keeper key (regenerate — devnet key is spent) |
| `KEEPER_SWAP` | `jupiter` (keeper service only) |
| `FUNDER_SECRET_KEY` | **remove** |

Also regenerate `lib/anchor-idl.json` from the mainnet build (the address
field inside it is what `anchor-client.ts` and the keeper read).

`lib/pricing.ts` holds `SOL_USD = 150` — this is only the FALLBACK used by
`lib/sol-price.ts` when the live price fetch fails with a cold cache; live
quotes (`/api/quote`) already price against the real SOL/USD rate. Before
launch, refresh the fallback to a current ballpark so a price-API outage
doesn't misprice claims by 50%.

## 3. Rehearsal on mainnet (small money, before announcing)

1. Claim 2–3 cheap tiles with a burner wallet — verify 85/15 split lands
   (treasury + buyback escrow) and Supabase mirrors the claim.
2. Let the keeper run one pass with `KEEPER_SWAP=jupiter` — verify a real
   swap executes and `embedded_vava` increases on the tiles.
3. Place, decline, and accept a bid between two burners — verify escrow
   refund and the 95/5 split.
4. Raze one tile — verify the 10% haircut burn.
5. Stake/unstake round trip — verify the 24 h delay gates withdrawal.

## 4. Flip the switch

- [ ] Point `vavaworld.net` at production (Railway custom domain — see
      `docs/railway-deploy.md`).
- [ ] Verify `/api/quote` signs against the mainnet keeper key.
- [ ] Watch keeper logs for the first organic pass.

## Rollback

The app is env-driven: restoring the devnet env vars and redeploying
reverts the site to devnet in one push. The on-chain program has no
rollback — anything wrong there ships as a new deploy, which is why
step 3 happens before any announcement.
