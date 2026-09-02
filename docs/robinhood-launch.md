# Robinhood Chain launch runbook

Every step from here to opening the doors on Robinhood Chain, in order.
This REPLACES `mainnet-cutover.md` (the Solana runbook) on this branch -
that file is kept for the frozen Solana fallback on `main`.

## Chain facts (verified live)

| | Testnet | Mainnet |
|---|---|---|
| RPC | `https://rpc.testnet.chain.robinhood.com/rpc` | `https://rpc.chain.robinhood.com/rpc` |
| Chain id | 46630 | 4663 |
| Explorer | explorer.testnet.chain.robinhood.com | explorer.chain.robinhood.com |
| Gas token | ETH (no native chain token exists - anything sold as one is a scam) | ETH |
| Faucet | faucet.testnet.chain.robinhood.com (paste address, no captcha) | - |

## Addresses

| What | Address |
|---|---|
| Treasury (hardware wallet, baked into constructor) | `0x48097570cAe9857034536CE7226D34AF4E5587B9` |
| Testnet deployer (throwaway; key in `evm/.deployer-testnet.key`, gitignored) | `0xcf45a13e079F3fFEF6197F318D70186b600adCF7` |
| Mainnet deployer + keeper | generate fresh keys before mainnet deploy; keeper key goes in `KEEPER_EVM_KEY` env only |
| USDG (mainnet) | look up the canonical USDG token on the mainnet explorer before deploy - do NOT trust a pasted address from chat/DMs |

## 1. Deploy (testnet first, then mainnet - same commands)

```bash
cd evm
TREASURY_ADDRESS=0x48097570cAe9857034536CE7226D34AF4E5587B9 \
KEEPER_ADDRESS=<keeper 0x address> \
EVM_DEPLOYER_KEY=<deployer private key> \
npx hardhat run scripts/deploy.ts --network robinhoodTestnet   # or robinhood
```

- `RH_TESTNET_RPC` / `RH_RPC` env feed the network entries in `hardhat.config.ts`.
- Omit `STANDIN_MINT`/`USDG_ADDRESS` on testnet: the script deploys MockVava
  stand-ins for both. On MAINNET pass the real `USDG_ADDRESS`; the VAVA slot
  starts as a stand-in and is swapped at launch minute.
- The script prints a JSON blob - paste it into the env tables below.

## 2. Env flip (Vercel + Railway web + Railway keeper)

**Branch first:** production (Vercel prod + both Railway services) deploys
`main`, which holds the frozen Solana stack. Going live on Robinhood means
merging `evm` -> `main` (after the testnet rehearsal passes), which flips
every host at once. The Railway keeper service must ALSO have its start
already pointing at `npm run keeper` - on the evm branch that script IS the
EVM keeper, so no service reconfiguration is needed beyond env vars.

| Variable | Value | Where |
|---|---|---|
| `NEXT_PUBLIC_EVM_RPC_URL` | chain RPC | web (browser reads) |
| `EVM_RPC_URL` | chain RPC | web server |
| `RPC_URL` | chain RPC | keeper service |
| `NEXT_PUBLIC_TILES_CONTRACT` / `TILES_CONTRACT` | deploy output `tiles` | web + keeper |
| `NEXT_PUBLIC_USDG_CONTRACT` | deploy output `usdg` | web |
| `NEXT_PUBLIC_EVM_CHAIN_ID` | 46630 / 4663 | web |
| `CHAIN_ID` | 46630 / 4663 | keeper service |
| `KEEPER_EVM_KEY` | keeper private key | web server (quote signing) + keeper service |
| `KEEPER_INTERVAL_SECS` | `60` | keeper service |
| `KEEPER_SWAP` | `reference` until launch minute, then `uniswap` | keeper service |
| `SWAP_ROUTER`, `WETH_ADDRESS`, `POOL_FEE` | where $VAVA liquidity lives (see §5) | keeper service |
| `START_BLOCK` | the deploy block number | keeper (log-scan floor) |
| `SITE_URL` | `https://vavaworld.net` - enables the registry reconcile (keeper re-mirrors any Claimed hex Supabase lacks). Leave UNSET for local rehearsals | keeper service |
| `ADMIN_WALLETS` / `NEXT_PUBLIC_ADMIN_WALLETS` | comma-separated moderator addresses (case-insensitive) - ASK THE USER before launch | web |
| `CHAINLINK_ETH_USD_FEED` | ETH/USD aggregator on Robinhood Chain if one exists (verify on explorer); empty = Coinbase spot fallback | web server |
| `ETH_USD_FALLBACK` | last-resort ETH/USD constant (default 4500) | web server |
| `NEXT_PUBLIC_CLAIM_CHUNK` | hexes per claim tx (default 400) | web |

Gone from the Solana era: `NEXT_PUBLIC_PROGRAM_ID`, `NEXT_PUBLIC_TREASURY`
(treasury is baked into the contract), `KEEPER_SECRET_KEY` (base58),
`FUNDER_SECRET_KEY`.

## 3. Testnet rehearsal (scripted + clicked)

Scripted (the local E2E, pointed at testnet): `evm/scripts/seed-local.ts`
claims in BOTH currencies via real EIP-712 quotes, then one keeper pass
(`scripts/keeper-evm.mjs`, reference mode) must leave
`totalPendingWei == 0 && totalPendingUsd == 0` with `embeddedVava > 0`.

Clicked (the user, in a real browser against the testnet site):
1. Log in with Privy (social AND wallet path)
2. Claim with ETH; claim with USDG (approve + claim)
3. Verify 85% lands in the treasury address on the explorer
4. Bid: place -> decline (refund) -> place -> accept (95/5 flip)
5. List -> atomic buy
6. Stake -> beginUnstake -> withdraw blocked for 24h
7. Property image upload + moderation removal
8. Large batch: ~50 hexes in one click, ONE transaction
9. **Raze every rehearsal hex** - `updateMint` refuses while the vault
   holds tokens, so the stand-in vault must be drained
10. **Scrub the registry.** The preview site mirrors into the SAME
    Supabase project as production, so clicked testnet claims show up on
    the live leaderboard/activity until removed. After razing, delete
    the rehearsal wallet's rows from `hexes` (and any `listings`/`bids`
    it created) and decrement `countries.claim_count` by the same count
    per country, so the live price curve is untouched.

Testnet deployment (2026-09-02, batch-enabled contract
`0x8677c5404970BC93Fd3B85747F0d92697b057763`, stand-in tokens reused):
`evm/deployments/testnet.json`. The
scripted half (`evm/scripts/rehearse-testnet.ts` + a keeper pass with
`START_BLOCK=111342775`, `SITE_URL` unset) passed: 85% landed in the
treasury in both currencies, pending drained to 0/0.

**Registry zeroed 2026-09-02 (user's call):** every claim from both eras
- Solana devnet and Robinhood testnet - plus all bids, sales,
notifications, property images and country counters were deleted.
Launch starts from a truly empty world; profiles (accounts) were kept.
Only the clicked mainnet rehearsal will write rows between now and
launch, and it ends with the same scrub.

## 4. Mainnet deploy + small-money rehearsal

Same §1 commands against `robinhood` with real USDG address. Fund the
deployer with ~$20 of ETH (contract deploy costs cents here, not 5.5 SOL).
Repeat §3 with small real money. Checkpoint #1: 85% of the first claim
lands in `0x4809...87B9`. End by razing everything.

## 5. Launch minute (Pons)

1. User creates $VAVA on **Pons** -> token address to Claude
2. Find where the liquidity actually lives (Pons' own pool vs Uniswap) -
   this decides `SWAP_ROUTER` + pool fee for the keeper. Verify by reading
   the pair on the explorer, not from docs alone.
3. `updateMint(<real VAVA>)` (admin tx; refuses if stand-in vault not empty)
4. One test claim + one keeper pass against the real token
5. `lockMint()` - PERMANENT
6. Flip keeper to `KEEPER_SWAP=uniswap` with the verified router; watch the
   FIRST real swap land - the last untested code path
7. Open the doors

## Rollback

The app is env-driven: pointing the envs back at a previous contract (or
the frozen Solana stack on `main`) reverts the site in one deploy. The
contract itself has no admin backdoors beyond keeper/mint rotation - by
design - so anything wrong on-chain ships as a NEW contract + env flip.
Claimed hexes on an abandoned contract can be razed by their owners at any
time; nothing is custodial.
