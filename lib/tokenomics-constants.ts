/**
 * THE single source for tokenomics numbers in the app layer. Mirrors
 * docs/tokenomics.md - change there first, then here. On-chain
 * equivalents live in anchor/programs/tiles/src/constants.rs.
 */

/** $VAVA has 6 decimals (pump.fun standard). */
export const VAVA_DECIMALS = 6;
export const VAVA_UNIT = 10 ** VAVA_DECIMALS;

/** Staking tiers - fixed token amounts (whole $VAVA). */
export const TIERS = [
  { key: 'tourist', name: 'Tourist', threshold: 0 },
  { key: 'citizen', name: 'Citizen', threshold: 250_000 },
  { key: 'baron', name: 'Baron', threshold: 500_000 },
  { key: 'president', name: 'President-eligible', threshold: 1_000_000 },
] as const;
export type TierKey = (typeof TIERS)[number]['key'];

export function tierFor(stakedWhole: number): TierKey {
  if (stakedWhole >= 1_000_000) return 'president';
  if (stakedWhole >= 500_000) return 'baron';
  if (stakedWhole >= 250_000) return 'citizen';
  return 'tourist';
}

/** Primary claim discount per tier (fraction). */
export const CLAIM_DISCOUNT: Record<TierKey, number> = {
  tourist: 0,
  citizen: 0.05,
  baron: 0.1,
  president: 0.1,
};

/** Secondary market, seller-side. President cut is NEVER discounted. */
export const SECONDARY_FEE_BPS: Record<'standard' | 'baron', number> = {
  standard: 500, // 4% protocol + 1% president
  baron: 300, //    2% protocol + 1% president
};
export const PRESIDENT_SECONDARY_BPS = 100;

/** Primary claim split (bps). President share falls to treasury while
 *  a throne is vacant. */
export const EMBEDDED_BPS = 1_500;
export const PRESIDENT_PRIMARY_BPS = 500;

/** Raze: embedded VAVA payout haircut, burned. */
export const RAZE_HAIRCUT_BPS = 1_000;

/** Unstake cooldown. */
export const UNSTAKE_DELAY_SECS = 259_200; // 3 days

/** Presidency: land floor + coup window. */
export const PRESIDENT_MIN_HEXES = 250;
export const PRESIDENT_LAND_SHARE = 0.05; // max(250, 5% of country claims)
export const COUP_WINDOW_SECS = 86_400; // 24h
