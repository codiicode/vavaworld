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

## 1. On-chain program — DONE except deploy

Already baked into `anchor/target/deploy/tiles.so` (437 KB, built):
- `TREASURY = AkXJgHBo2Y4KWLi5h5UBAMgKTMn9SotfryZHjLJ3BvFN`
- Program id `9L3cE2XpkUjdQrMUwxmU83ZMNPsgGxiTHfXxKorvjoJt`
  (keypair: `anchor/target/deploy/tiles-mainnet-keypair.json`)

Deploy day, from repo root (needs ~5.6 SOL on the deployer wallet
`74fWA4NXGtv7RJEd9oTJk9vjqZCTMz2W1s5soCvC6b4X`):

```bash
export RPC_URL="<helius mainnet url>"
solana program deploy anchor/target/deploy/tiles.so \
  --program-id anchor/target/deploy/tiles-mainnet-keypair.json \
  --url "$RPC_URL"
```

Then flip `lib/anchor-idl.json`'s `address` field to the mainnet id and
commit — every client and script reads the program id from there.

### Init with a STAND-IN mint first (the devnet pattern, on purpose)

`init_config` creates the token vault against a mint, but real $VAVA
doesn't exist until launch minute. So: create a throwaway SPL mint on
mainnet (6 decimals, tiny supply), init and REHEARSE with it, and swap in
the real mint at launch. That is exactly what `update_mint`/`lock_mint`
exist for.

```bash
spl-token create-token --decimals 6 --url "$RPC_URL"   # note <STANDIN>
RPC_URL=$RPC_URL node anchor/scripts/init-config.mjs <STANDIN>
RPC_URL=$RPC_URL node anchor/scripts/init-counters.mjs
# stake vault init runs inside smoke-staking.mjs (idempotent)
```

Rehearse with `KEEPER_SWAP=reference` + the stand-in mint (no market
exists for it, so Jupiter mode can't run yet).

**End the rehearsal by RAZING every rehearsal hex** - `update_mint`
refuses while the old vault still holds tokens, so the stand-in vault
must be drained before the real mint can be connected.

### Launch minute

```bash
# after the real $VAVA is minted on pump.fun:
RPC_URL=$RPC_URL node anchor/scripts/update-mint.mjs <REAL_VAVA_MINT>
# verify a claim + one keeper pass against the real mint, then:
RPC_URL=$RPC_URL node anchor/scripts/lock-mint.mjs   # PERMANENT
```

Flip the keeper service to `KEEPER_SWAP=jupiter` and watch its FIRST
real swap land - that is the last untested code path in the system.

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
