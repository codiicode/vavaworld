import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getSolUsd } from '@/lib/sol-price';
import { PRICING } from '@/lib/pricing';

export const runtime = 'nodejs';
export const revalidate = 30;

/**
 * GET /api/owner?handle=<username-or-address> → real profile + holdings
 * for one player: profile row (if any), totals, per-country breakdown.
 * Powers /u/[handle] and /profile stat cards. A handle that matches
 * nothing returns zeros (never 404s - the UI renders a stub).
 */
export async function GET(req: Request) {
  const SOL_USD = await getSolUsd();
  const handle = new URL(req.url).searchParams.get('handle')
    ?? new URL(req.url).searchParams.get('address');
  if (!handle) {
    return NextResponse.json({ error: 'handle is required' }, { status: 400 });
  }

  const sb = getServerSupabase();

  // Resolve: try username first (usernames are 2-24 chars), else treat as
  // wallet address. Solana addresses are base58, 32-44 chars.
  let address = handle;
  let profile: {
    wallet_address: string;
    username: string | null;
    flag_country_code: string | null;
    avatar_url: string | null;
    bio: string | null;
    created_at: string;
  } | null = null;

  const { data: byName } = await sb
    .from('profiles')
    .select('wallet_address,username,flag_country_code,avatar_url,bio,created_at')
    .ilike('username', handle)
    .maybeSingle();

  if (byName) {
    profile = byName;
    address = byName.wallet_address;
  } else {
    const { data: byAddr } = await sb
      .from('profiles')
      .select('wallet_address,username,flag_country_code,avatar_url,bio,created_at')
      .eq('wallet_address', handle)
      .maybeSingle();
    profile = byAddr ?? null;
  }

  const [
    { data: stats, error: e1 },
    { data: countries, error: e2 },
    { data: recent },
  ] = await Promise.all([
    sb.rpc('owner_stats', { p_owner: address }),
    sb.rpc('owner_countries', { p_owner: address }),
    sb
      .from('hexes')
      .select('h3_id, country_iso, purchase_price, claimed_at, image_url')
      .eq('owner', address)
      .order('claimed_at', { ascending: false })
      .limit(12),
  ]);
  const err = e1 ?? e2;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  // Mark-to-floor valuation: each hex in a country is worth that country's
  // CURRENT floor (the price the next claim pays). The floor only ratchets
  // up with claim_count, so early buyers show green.
  const isoList = ((countries ?? []) as Array<{ country_iso: string }>).map(
    (c) => c.country_iso,
  );
  const floorByIso = new Map<string, number>();
  if (isoList.length > 0) {
    const { data: floors } = await sb
      .from('countries')
      .select('iso_code, claim_count')
      .in('iso_code', isoList);
    for (const f of floors ?? []) {
      floorByIso.set(
        f.iso_code,
        PRICING.BASE_FLOOR_USD + Number(f.claim_count) * PRICING.SLOPE_PER_CLAIM_USD,
      );
    }
  }

  const s = (stats as Array<{
    hex_count: number;
    country_count: number;
    total_spent_usd: number;
    first_claim_at: string | null;
    last_claim_at: string | null;
  }> | null)?.[0];

  const countryRows = ((countries ?? []) as Array<{
    country_iso: string;
    country_name: string | null;
    hex_count: number;
    total_spent_usd: number;
  }>).map((c) => {
    const floor = floorByIso.get(c.country_iso) ?? PRICING.BASE_FLOOR_USD;
    return {
      iso: c.country_iso.toLowerCase(),
      name: c.country_name ?? c.country_iso,
      hexes: Number(c.hex_count),
      spentUsd: Number(c.total_spent_usd),
      valueUsd: Number(c.hex_count) * floor,
    };
  });
  const totalSpentUsd = Number(s?.total_spent_usd ?? 0);
  const portfolioValueUsd = countryRows.reduce((sum, c) => sum + c.valueUsd, 0);

  return NextResponse.json({
    address,
    username: profile?.username ?? null,
    flagCountryCode: profile?.flag_country_code ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    bio: profile?.bio ?? null,
    joinedAt: profile?.created_at ?? s?.first_claim_at ?? null,
    hexes: Number(s?.hex_count ?? 0),
    countries: Number(s?.country_count ?? 0),
    totalSpentUsd: Number(s?.total_spent_usd ?? 0),
    totalSpentSol: Number(s?.total_spent_usd ?? 0) / SOL_USD,
    firstClaimAt: s?.first_claim_at ?? null,
    lastClaimAt: s?.last_claim_at ?? null,
    portfolioValueUsd,
    returnUsd: portfolioValueUsd - totalSpentUsd,
    returnPct: totalSpentUsd > 0 ? ((portfolioValueUsd - totalSpentUsd) / totalSpentUsd) * 100 : 0,
    byCountry: countryRows,
    recentHexes: ((recent ?? []) as Array<{
      h3_id: string;
      country_iso: string;
      purchase_price: number;
      claimed_at: string;
      image_url: string | null;
    }>).map((h) => ({
      h3: h.h3_id,
      iso: h.country_iso.toLowerCase(),
      paidUsd: Number(h.purchase_price),
      claimedAt: h.claimed_at,
      imageUrl: h.image_url ?? null,
    })),
  });
}
