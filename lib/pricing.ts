/**
 * Primary-claim pricing.
 *
 *   floor_usd = BASE_FLOOR_USD + (country_claim_count * SLOPE_PER_CLAIM_USD)
 *
 * Each country tracks its own claim_count. Quote → on-chain payment → commit
 * is validated against a slippage tolerance so concurrent claims at the same
 * floor don't surprise the user.
 *
 * Server-only (imports the boundary resolver). Client UI calls the API routes.
 */
import { getServerSupabase } from './supabase-server';
import { resolveHexCountry, INTL } from './geo/country-resolver';

export const PRICING = {
  BASE_FLOOR_USD: 0.1,
  SLOPE_PER_CLAIM_USD: 0.00001,
  H3_RESOLUTION: 12,
  CURRENCY_DECIMAL_PLACES: 4,
  TX_SLIPPAGE_TOLERANCE: 0.02,
} as const;

// Legacy named exports — preserved so existing imports
// (`import { H3_RESOLUTION } from '@/lib/pricing'`) keep working.
export const BASE_FLOOR = PRICING.BASE_FLOOR_USD;
export const SLOPE = PRICING.SLOPE_PER_CLAIM_USD;
export const H3_RESOLUTION = PRICING.H3_RESOLUTION;

/**
 * Pure floor formula. Returns the raw USD value — display rounding happens
 * in `formatFloor` and storage rounding happens in the DB (DECIMAL(12,4)).
 * Keeping this unrounded means tests can pin exact 5-decimal expectations
 * like 1 claim → $0.10001.
 */
export function calculateFloor(claimCount: number): number {
  return PRICING.BASE_FLOOR_USD + claimCount * PRICING.SLOPE_PER_CLAIM_USD;
}

/** Canonical N-decimal display string, e.g. 0.1 → "0.1000". */
export function formatFloor(value: number): string {
  return value.toFixed(PRICING.CURRENCY_DECIMAL_PLACES);
}

/**
 * Returns true if a quote is still acceptable against the current floor —
 * i.e. either it's at/above the floor, or the downward drift is within the
 * configured slippage tolerance. Tiny FP epsilon so an exact-on-boundary
 * caller (e.g. drift = 0.020000000000000018 from 0.02 in IEEE 754) passes.
 */
export function isQuoteFresh(quotedUsd: number, currentFloorUsd: number): boolean {
  if (quotedUsd >= currentFloorUsd) return true;
  const drift = Math.abs(currentFloorUsd - quotedUsd) / currentFloorUsd;
  return drift <= PRICING.TX_SLIPPAGE_TOLERANCE + 1e-9;
}

export type CountryState = {
  countryIso: string;
  countryName: string;
  claimCount: number;
  floor: number;
};

export async function getCountryFloor(isoCode: string): Promise<number> {
  const state = await getCountryState(isoCode);
  return state.floor;
}

export async function getCountryState(isoCode: string): Promise<CountryState> {
  const iso = (isoCode || INTL).toUpperCase();
  const sb = getServerSupabase();
  const { data } = await sb
    .from('countries')
    .select('iso_code,name,claim_count')
    .eq('iso_code', iso)
    .maybeSingle<{ iso_code: string; name: string; claim_count: number }>();
  const claimCount = data?.claim_count ?? 0;
  return {
    countryIso: iso,
    countryName: data?.name ?? iso,
    claimCount,
    floor: calculateFloor(claimCount),
  };
}

export type HexFloor = {
  h3Id: string;
  countryIso: string;
  countryName: string;
  available: boolean;
  claimCount: number;
  currentFloor: number;
  nextFloor: number;
  claimed: null | { owner: string; purchasePrice: number; claimedAt: string };
};

/** Resolve a hex → country, then return the floor + claim metadata. */
export async function getHexFloor(h3Id: string): Promise<HexFloor> {
  const countryIso = resolveHexCountry(h3Id);
  const sb = getServerSupabase();

  const [{ data: country }, { data: hex }] = await Promise.all([
    sb
      .from('countries')
      .select('name,claim_count')
      .eq('iso_code', countryIso)
      .maybeSingle<{ name: string; claim_count: number }>(),
    sb
      .from('hexes')
      .select('owner,purchase_price,claimed_at')
      .eq('h3_id', h3Id)
      .maybeSingle<{ owner: string; purchase_price: number; claimed_at: string }>(),
  ]);

  const claimCount = country?.claim_count ?? 0;
  const claimed = hex
    ? {
        owner: hex.owner,
        purchasePrice: Number(hex.purchase_price),
        claimedAt: hex.claimed_at,
      }
    : null;
  return {
    h3Id,
    countryIso,
    countryName: country?.name ?? countryIso,
    available: !claimed && countryIso !== INTL,
    claimCount,
    currentFloor: calculateFloor(claimCount),
    nextFloor: calculateFloor(claimCount + 1),
    claimed,
  };
}
