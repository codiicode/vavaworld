/**
 * Primary-claim pricing.
 *
 * Every country starts at a $0.10 floor that rises linearly with the number
 * of claims in that country:
 *
 *   country_floor = BASE_FLOOR + (claims_in_country * SLOPE)
 *
 * All hexes in a country share the same floor at any moment. The server-side
 * functions here resolve a hex → country and read live counts from Supabase;
 * the actual claim/increment is atomic in the `claim_hex` DB function.
 *
 * Server-only (imports the boundary resolver). Client UI calls the API routes.
 */
import { getServerSupabase } from './supabase-server';
import { resolveHexCountry, INTL } from './geo/country-resolver';

export const BASE_FLOOR = 0.1;
export const SLOPE = 0.00001;
export const H3_RESOLUTION = 12;

/** Pure floor formula. Unrounded; format with `formatFloor` for display. */
export function calculateFloor(claimCount: number): number {
  return BASE_FLOOR + claimCount * SLOPE;
}

/** Canonical 3-decimal display string, e.g. 0.1 → "0.100". */
export function formatFloor(value: number): string {
  return value.toFixed(3);
}

export type CountryState = {
  countryIso: string;
  countryName: string;
  claimCount: number;
  floor: number;
};

/** Floor for a country code (reads live `claim_count` from the DB). */
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
  claimCount: number;
  floor: number;
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
  return {
    h3Id,
    countryIso,
    countryName: country?.name ?? countryIso,
    claimCount,
    floor: calculateFloor(claimCount),
    claimed: hex
      ? {
          owner: hex.owner,
          purchasePrice: Number(hex.purchase_price),
          claimedAt: hex.claimed_at,
        }
      : null,
  };
}
