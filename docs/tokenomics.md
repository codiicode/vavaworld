# $VAVA Tokenomics

Status: **designed and largely built** — the revenue split, embedded
VAVA + raze, staking, the secondary market and the president/coup
system are implemented and running on Solana devnet (2026-08-28).
Remaining before launch: hardening + the pump.fun drop itself. Numbers
marked **OPEN** are deliberately unset until launch price discovery.
Launch venue: **pump.fun** (decided 2026-08-25).

## TL;DR

- VavaWorld sells the earth as ~9m hexagons. Primary claims start at
  **$0.10** and rise with every claim in that country.
- **15% of every land purchase auto-buys $VAVA on the market and locks
  it inside the hex you bought.** Land is literally redeemable for the
  token (raze it: 90% out, 10% burned). Buy pressure is mechanical,
  not promised.
- **5%** of every claim is the country president's live salary; **80%**
  runs the protocol.
- Stake $VAVA to climb: **Citizen 250k** (5% off claims), **Baron
  500k** (10% off + trade at 3% instead of 5%), **1M** = eligible to
  claim a national throne. No yield, by design — staking buys power,
  not promises.
- Thrones are taken, not given: own the most land + stake 1M, and
  defend against public **24-hour coups** from anyone who out-owns you.
- Fair launch on pump.fun: full 1B supply through the public curve, no
  team allocation, LP burned at graduation.

## Overview

VavaWorld sells hexes (primary claims, priced in SOL). $VAVA is a
plain SPL token, fair-launched on pump.fun. The core loop:

> Every land purchase automatically buys $VAVA off the market and
> locks it inside the purchased hex. The land is redeemable for the
> token; the token gets mechanical, product-driven buy pressure.

No user ever needs to touch $VAVA to use the product. All token
mechanics run under the hood of a plain SOL payment, enforced by our
own on-chain program — the launchpad only hosts where the token
trades.

## Token launch: pump.fun fair launch

- pump.fun creates the mint. The **full supply (1B, fixed) sells
  through the public bonding curve** — no team allocation, no
  pre-sale, no self-funded LP. At ~$69k market cap (~85 SOL raised)
  the token graduates to PumpSwap with burned LP.
- "We only own what we bought like everyone else." That is both the
  distribution story and a deliberately clean securities profile.
- **Swap income:** we control no pool fees. We earn pump.fun's
  creator revenue share (0.05% of PumpSwap trades to the creator
  vault, plus elevated early-phase creator fees under their
  dynamic-fee program). Treat as pocket change, never a revenue
  pillar. **Primary claims are the business.**

### Hard launch conditions

1. **Token and primary claims go live the same day.** The 15%
   embedded-VAVA engine must be buying on the bonding curve from
   minute one — fewer than 2% of pump.fun tokens ever graduate, and
   product-driven buy flow is our graduation edge.
2. The buyback keeper routes swaps via **Jupiter** (works against
   both the pre-graduation curve and PumpSwap) and **TWAPs** its buys
   in small batches — post-graduation liquidity is thin, and lump-sum
   buys would whip the embedded-value cost basis around.
3. **No commitments anywhere that depend on owning a token
   treasury** — that door is permanently closed on this path.

### Accepted trade-offs (eyes open)

No anti-snipe protection on the curve; platform risk (pump.fun has
changed fee terms repeatedly); memecoin stigma — countered by the
fair-launch story and the product itself.

### Fallback: Meteora DBC

Only if conditions flip before launch week: we decide we need a
treasury allocation, sniper-hostile fee scheduling, or configured
migration liquidity — or the product is not launch-ready when the
token must ship. The implementation is launchpad-agnostic (Jupiter
routing, no hardcoded pool), so the venue choice stays reversible
until launch week.

## Primary claim pricing

Locked, implemented in `lib/pricing.ts` and enforced by `/api/claim`:

```
price_usd = 0.10 + (country_claim_count × 0.00001)
```

- Every country has its own counter. First hex in any country: $0.10.
  Price doubles at 10,000 claims, reaches $1.10 at 100,000.
- 2% slippage tolerance between quote and payment.
- The on-chain T1/T2/T3 tier curve in the Anchor program is a separate
  legacy/resale path — never conflate it with primary pricing.

## Revenue waterfall

### Primary claims (100% of price, paid in SOL)

| Share | Recipient | Mechanism |
|---|---|---|
| 15% | The hex itself | Swapped to $VAVA on-market (Jupiter-routed), locked inside the hex ("embedded VAVA") |
| 5% | Country president | Paid in SOL, live. No president → falls to treasury |
| 80% | Treasury | Operations, growth, Federal Land budget (phase 2) |

The split facing the user is always 15/5/80. Federal Land is funded
out of the treasury share, not a separate cut.

Decision note (2026-08-25): 20/5/75 was considered and rejected. The
embedded share can only ever be *raised* without damage — raising it
later is a free bullish lever; lowering it reads as a rug signal. We
start at 15 and keep the lever.

### Secondary market (player-to-player)

- **5% fee, seller-side** (deducted from proceeds; buyers always see
  clean prices): seller keeps 95%, **4% protocol + 1% country
  president**.
- **Barons (staking tier) trade at 3%**: 2% protocol + 1% president.
  The president's 1% is never discounted — presidents are
  load-bearing.
- The hex's embedded VAVA transfers with the hex, untouched.
- Hexes trade only through our program — no off-platform venue
  exists, so this fee has no competitive leakage.
- **No fee-free transfer path.** At 5%, OTC dodging ("I send the hex,
  you send SOL separately") becomes worth it — so the program exposes
  no free transfer/gift instruction. Every ownership change settles
  through the fee-bearing market path.

## Embedded VAVA & raze

Every claim swaps 15% of the price to $VAVA and locks it **in the
hex, not with the user**. The hex and its content are inseparable.

- **Transfer:** selling a hex sells its embedded VAVA with it.
  Nothing unlocks on transfer, ever.
- **Raze:** the only way to extract embedded VAVA. The owner destroys
  the hex: it returns to unclaimed land on the map (re-claimable at
  full primary price), and the owner receives the embedded VAVA minus
  a **10% haircut, which is burned**.

### Why raze exists

Backing without redemption is fiction. Raze makes the floor real:

- A hex listed below its embedded value gets bought and razed by
  arbitrage for profit. **No hex can trade below ~its token
  content.** The floor is enforced by greed, not promises.
- Buyers get land upside plus a built-in downside hedge ("worst case
  I raze") — lowers the psychological bar for new users.
- Self-limiting abuse: claim at $100 → immediate raze returns ~$13.50.
  An 86% guaranteed loss needs no cooldown rules.

### System behavior across market regimes

- **Normal:** hexes are worth more than their content → nobody razes
  → every new claim locks more supply. Locked supply ratchets up.
- **$VAVA pumps hard:** cheapest hexes' content exceeds their market
  price → arb razes them → released VAVA dampens the pump → razed
  land re-enters the map → later re-claimed at full primary price (we
  earn the 80% margin again, 15% re-locks). Raze-reclaim cycles are
  recurring revenue on land already sold once.

## Staking: Citizens & Tourists

On top of embedded VAVA (automatic, per-hex), users can stake $VAVA
at the account level. Unstaked users are **Tourists** — they can
claim and trade, nothing more. Staking makes you a **Citizen** of
VavaWorld. **No yield, by design**: every staking benefit is utility
(discounts, power, status), never a promised return. A revenue-
financed "Citizens' dividend" stays in the back pocket as a possible
future lever, pending legal review.

### Tiers (fixed token amounts, decided 2026-08-28)

| Tier | Stake | Benefits |
|---|---|---|
| Tourist | 0 | Claim + trade at standard terms (5% secondary) |
| **Citizen** | **250,000 $VAVA** | **5% off primary claims** |
| **Baron** | **500,000 $VAVA** | **10% off primary claims** + **secondary fee 3% instead of 5%** |
| **President-eligible** | **1,000,000 $VAVA** | Throne eligibility (plus the per-country land floor) |

- Cosmetic layer (proposed, not locked): citizens' hexes get a
  visible glow on the map; barons may name their territory / set a
  banner. Unstaking turns it off.
- **Unstake delay: 3 days.** Falling below a tier (unstake in
  progress) switches its benefits off immediately — same continuity
  rule as the throne.
- Staked balance is public: leaderboard column, profile.

### Why fixed token amounts, not USD thresholds

- USD thresholds have a fatal flaw: when the price dips, the required
  token amount rises and stakers lose status through no action of
  their own — punishing holders exactly when loyalty matters most.
- Fixed amounts need no oracle, keep supply-lock math predictable,
  and let early citizens' status appreciate with the token.
- The cost: tiers get expensive in USD as market cap grows. Handled
  by the ratchet lever — **re-tiering downward is always good news**
  ("citizenship just got cheaper") and can be done anytime; that is
  the documented adjustment path.

### Supply math (eyes open)

Supply is fixed at 1B. Citizen at 250k = 0.025% of supply → a
theoretical max of ~4,000 citizens, realistically well under that:
citizenship is deliberately scarce, a premium status rather than a
mass-market perk — say it out loud in marketing ("the math only
allows a few thousand citizenships"). President at 1M × 249
countries = 249M (25% of supply) if every throne were occupied —
feasible, though vacant thrones with visibly unclaimed salaries
remain standing marketing early on.

Structural note: embedded VAVA permanently removes supply as claims
accumulate (only raze releases it), so the stakeable pool shrinks
over time and every tier gets scarcer. **Downward re-tiering is not
optional — it is the inevitable long-run adjustment path**, and it
always reads as good news.

## Presidents

One throne per country. Presidents are opt-in — the position is
claimed, never assigned automatically.

### Requirements (continuous, not one-time)

- Own at least `max(250, 5% of the country's claimed hexes)` in that
  country.
- Staked balance of at least **1,000,000 $VAVA** (the
  President-eligible staking tier).
- Violate either (sell below floor / unstake below tier) → throne
  goes vacant immediately.

### Taking the throne

- **Vacant throne:** first account meeting the requirements claims it
  instantly. Launch is a 249-country land grab.
- **Occupied throne — coup:** challenger must meet all requirements
  AND own more hexes in the country than the incumbent at initiation.
  A public **24h window** opens with a countdown. When it closes,
  whoever owns more hexes in the country holds the throne. The
  incumbent defends by buying.
- No coup bond, no cooldown. The capital requirement (own more than
  the president) is the spam brake: every repeat coup requires
  out-buying an incumbent who just defended.
- Being out-owned does NOT cost the throne by itself. It makes the
  president vulnerable, not deposed. Silent flips don't exist; every
  transfer of power is a public event.

### Presidential income & powers

- **5% of all primary claims** in the country, in SOL, live.
- **1% of secondary volume** in the country (from the 5% fee; the
  president's cut is identical when barons trade at 3%).
- Campaign power: may set a claim discount (0–20%) in their country,
  funded from their own fee share — presidents are incentivized to
  drive volume, so they market the product for us.
- Status: crown on leaderboard/profile, name + flag on the country
  page, shareable president OG card. Country pages show live "salary
  earned" — and for vacant thrones: "No president — 5% of all claims
  here is unclaimed salary."

## Federal Land (phase 2 — requires live secondary market)

Treasury-funded floor support that buys land, not just tokens.

- Protocol bot buys hexes listed **below ~75% of the country's
  current primary price** (objective, per-country, self-calibrating —
  no oracle), capped per country per epoch.
- Bought hexes become **State Reserve**: distinct color on the map,
  not listed on the regular marketplace.
- Re-released **only via scheduled state auctions**, minimum price 2×
  purchase price. The reserve buys weakness and sells strength; the
  spread is treasury profit. A few iconic locations may be designated
  permanent National Parks for the narrative.

## Phasing

1. **Launch:** pump.fun fair launch + primary claims same day, with
   the 15/5/80 split, embedded VAVA + raze, secondary market with 3%
   fee, presidents + coups, staking tiers (Citizens & Tourists).
2. **Phase 2:** Federal Land / State Reserve + auctions.
3. **Back pocket (designed, not committed):** stimulus drops / world
   events; raising the embedded share above 15% as a momentum lever.

## Implementation status (devnet, 2026-08-28)

1. ✅ Stand-in $VAVA mint with pump.fun-identical properties (6
   decimals, 1B supply, mint authority revoked). The real pump.fun
   mint is injected at launch and sealed permanently (`lock_mint`).
2. ✅ 15/5/80 split live in the on-chain claim flow; the 15% escrows
   in a buyback vault per tile.
3. ✅ Embedded VAVA: keeper converts escrowed SOL to market-bought
   $VAVA locked in the hex account (Jupiter TWAP on mainnet).
4. ✅ Raze: 90% payout / 10% burned / land returns to unclaimed.
5. ✅ Staking: stake / 3-day unstake / withdraw on-chain; tier ladder
   live at /staking.
6. ✅ Secondary market: quoted 95/4/1 split (97/2/1 for barons, read
   from on-chain stake), on-chain payment verification, atomic
   settlement with replay protection, real listings + sales feed.
7. ✅ Presidents & coups: claim-throne / coup with signed wallet
   messages, 1M stake verified on-chain, land rules enforced
   atomically in SQL, 24h windows auto-resolved every minute, live
   salary counter per reign.
8. ⬜ Launch hardening: unify claim settlement fully on-chain, close
   devnet trust-mode endpoints, batch claims >20 tiles, Pyth price
   oracle, security review.
9. ⬜ Launch: pump.fun listing + mainnet claims live the same day.

## Open parameters

| Parameter | Depends on |
|---|---|
| Buyback keeper TWAP batch size/interval | Post-graduation pool depth |
| Federal Land epoch caps | Treasury size at phase 2 |
| Staking cosmetics (glow / territory naming) | Proposed, not locked |
| Tier re-calibration (downward only) | Market cap growth post-launch |

## Design principles (why the model looks like this)

- **Zero token friction for users.** Mass adoption dies the moment a
  land buyer must acquire a second asset. All token flows are baked
  into the SOL price the user already pays.
- **Buy pressure must be mechanical, not promised.** 15% of every
  claim is a price-insensitive, continuous market buy that scales
  exactly with product success.
- **Every lock needs a real redemption or it's theater.** Raze is
  what makes "every hex is redeemable for real $VAVA" true.
- **Costs live in structure, not in rules.** No coup bonds, no
  cooldowns, no anti-abuse bureaucracy — every attack is unprofitable
  by arithmetic (raze haircut, coup capital requirement, wash-claim
  losses).
- **Fees follow pricing power.** Monopoly venue (secondary) carries
  3%; the swap venue is pump.fun's and we take only their creator
  share — swap income is pocket change by design, claims are the
  business.
- **Levers only ratchet up.** Parameters that read as promises
  (embedded share, haircut) launch at the conservative end; raising
  them later is free good news, lowering them is never possible.
