# $VAVA Tokenomics

Status: agreed design, pre-implementation. Numbers marked **OPEN** are
deliberately unset until token supply and launch price are fixed.

## Overview

VavaWorld sells hexes (primary claims, priced in SOL). $VAVA is the SPL
token that the economy locks value into. The core loop:

> Every land purchase automatically buys $VAVA off the market and locks
> it inside the purchased hex. The land is redeemable for the token;
> the token gets mechanical, product-driven buy pressure.

No user ever needs to touch $VAVA to use the product. All token
mechanics run under the hood of a plain SOL payment.

## Token launch

**Decision (2026-08-25): launch on pump.fun.** Meteora DBC is the
fallback if conditions change (see below).

- **Fair launch on pump.fun**: the platform creates the mint, the full
  supply sells through their bonding curve, and at ~$69k market cap
  (~85 SOL raised) the token graduates to PumpSwap with burned LP. No
  team allocation, no self-funded liquidity, no treasury tokens —
  "we only own what we bought like everyone else" is part of the story
  and keeps the securities profile clean.
- **Swap-fee income:** we do not control pool fees. We earn pump.fun's
  creator revenue share (0.05% of PumpSwap trades to the creator vault,
  plus elevated early-phase creator fees under their dynamic-fee
  program). Treat as pocket change, never a revenue pillar. Primary
  claims are the business.
- **Launch conditions (hard requirements):**
  1. Token and primary claims go live **the same day** — the 15%
     embedded-VAVA engine must be buying on the bonding curve from
     minute one. This is also the graduation strategy: <2% of pump.fun
     tokens graduate, and product-driven buy flow is our edge.
  2. The buyback keeper routes swaps via **Jupiter** (works against
     both the pre-graduation curve and PumpSwap) and **TWAPs** its
     buys in small batches — post-graduation liquidity is thin and
     lump-sum buys would whip the embedded-value cost basis around.
  3. No commitments anywhere that depend on owning a token treasury —
     that door is permanently closed on this path.
- **Flip conditions → Meteora DBC:** if we decide we need a treasury
  allocation, sniper-hostile fee scheduling, or configured migration
  liquidity — or if the product is not launch-ready when the token
  must ship. The implementation is launchpad-agnostic (Jupiter
  routing, no hardcoded pool), so this decision stays reversible
  until launch week.
- Accepted trade-offs, eyes open: no anti-snipe protection on the
  curve, platform risk (pump.fun has changed fee terms repeatedly),
  and pump.fun's memecoin stigma — countered by the fair-launch story
  and the product itself.

## Revenue waterfall

### Primary claims (100% of price, paid in SOL)

| Share | Recipient | Mechanism |
|---|---|---|
| 15% | The hex itself | Swapped to $VAVA on-market (Jupiter-routed), locked inside the hex ("embedded VAVA") |
| 5% | Country president | Paid in SOL, live. No president → falls to treasury |
| 80% | Treasury | Operations, growth, Federal Land budget (phase 2) |

The split facing the user is always 15/5/80. Federal Land is funded out
of the treasury share, not a separate cut.

### Secondary market (player-to-player)

- **3% fee, seller-side** (deducted from proceeds; buyers always see
  clean prices): **2% protocol + 1% country president**.
- The hex's embedded VAVA transfers with the hex, untouched.
- Hexes trade only through our program — no off-platform venue exists,
  so this fee has no competitive leakage.

## Embedded VAVA & raze

Every claim swaps 15% of the price to $VAVA and locks it **in the hex,
not with the user**. The hex and its content are inseparable.

- **Transfer:** selling a hex sells its embedded VAVA with it. Nothing
  unlocks on transfer, ever.
- **Raze:** the only way to extract embedded VAVA. The owner destroys
  the hex: it returns to unclaimed land on the map (re-claimable at
  full primary price), and the owner receives the embedded VAVA minus
  a **10% haircut, which is burned**.

### Why raze exists

Backing without redemption is fiction. Raze makes the floor real:

- A hex listed below its embedded value gets bought and razed by
  arbitrage for profit. **No hex can trade below ~its token content.**
  The floor is enforced by greed, not promises.
- Buyers get land upside plus a built-in downside hedge ("worst case I
  raze") — lowers the psychological bar for new users.
- Self-limiting abuse: claim at $100 → immediate raze returns ~$13.50.
  An 86% guaranteed loss needs no cooldown rules.

### System behavior across market regimes

- **Normal:** hexes are worth more than their content → nobody razes →
  every new claim locks more supply. Locked supply ratchets up.
- **$VAVA pumps hard:** cheapest hexes' content exceeds their market
  price → arb razes them → released VAVA dampens the pump → razed land
  re-enters the map → later re-claimed at full primary price (we earn
  the 80% margin again, 15% re-locks). Raze-reclaim cycles are
  recurring revenue on land already sold once.

## Voluntary bonding

On top of embedded VAVA (which is automatic and per-hex), users can
bond $VAVA at the account level. Entirely optional.

| Purpose | Rule |
|---|---|
| Claim discount | Bond above threshold → **10% off primary claims** (threshold **OPEN**) |
| Presidency | Eligibility requires a bonded stake (size **OPEN**) |
| Status | Bonded balance is public — leaderboard column, profile |
| Unbond delay | **3 days** on all voluntary bonds |

## Presidents

One throne per country. Presidents are opt-in — the position is
claimed, never assigned automatically.

### Requirements (continuous, not one-time)

- Own at least `max(250, 5% of the country's claimed hexes)` in that
  country.
- Bonded stake of **OPEN** $VAVA.
- Violate either (sell below floor / unbond) → throne goes vacant
  immediately.

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
- **1% of secondary volume** in the country (from the 3% fee).
- Campaign power: may set a claim discount (0–20%) in their country,
  funded from their own fee share — presidents are incentivized to
  drive volume, so they market the product for us.
- Status: crown on leaderboard/profile, name + flag on the country
  page, shareable president OG card. Country pages show live "salary
  earned" — and for vacant thrones: "No president — 5% of all claims
  here is unclaimed salary."

## Federal Land (phase 2 — requires live secondary market)

Treasury-funded floor support that buys land, not just tokens.

- Protocol bot buys hexes listed **below ~75% of the country's current
  primary price** (objective, per-country, self-calibrating — no
  oracle), capped per country per epoch.
- Bought hexes become **State Reserve**: distinct color on the map,
  not listed on the regular marketplace.
- Re-released **only via scheduled state auctions**, minimum price 2×
  purchase price. The reserve buys weakness and sells strength;
  the spread is treasury profit. A few iconic locations may be
  designated permanent National Parks for the narrative.

## Phasing

1. **Launch:** pump.fun fair launch (token + claims same day), primary
   claims with 15/5/80 split, embedded VAVA + raze, secondary market
   with 3% fee, presidents + coups, voluntary bonding (discount +
   stake).
2. **Phase 2:** Federal Land / State Reserve + auctions.
3. **Back pocket (not committed):** stimulus drops / world events —
   designed, cut for now.

## Open parameters

| Parameter | Depends on |
|---|---|
| President stake size | Market price after launch (pump.fun supply is fixed at 1B) |
| Discount bond threshold | Market price after launch |
| Buyback keeper TWAP batch size/interval | Post-graduation pool depth |
| Federal Land epoch caps | Treasury size at phase 2 |

## Design principles (why the model looks like this)

- **Zero token friction for users.** Mass adoption dies the moment a
  land buyer must acquire a second asset. All token flows are baked
  into the SOL price the user already pays.
- **Buy pressure must be mechanical, not promised.** 15% of every
  claim is a price-insensitive, continuous market buy that scales
  exactly with product success.
- **Every lock needs a real redemption or it's theater.** Raze is what
  makes "every hex is redeemable for real $VAVA" true.
- **Costs live in structure, not in rules.** No coup bonds, no
  cooldowns, no anti-abuse bureaucracy — every attack is unprofitable
  by arithmetic (raze haircut, coup capital requirement, wash-claim
  losses).
- **Fees follow pricing power.** Monopoly venue (secondary) carries
  3%; the swap venue is pump.fun's and we take only their creator
  share — swap income is pocket change by design, claims are the
  business.
