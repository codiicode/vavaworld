import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { SOL_USD } from '@/lib/pricing';

export const runtime = 'nodejs';
export const revalidate = 30;

/**
 * GET /api/owner?handle=<username-or-address> → real profile + holdings
 * for one player: profile row (if any), totals, per-country breakdown.
 * Powers /u/[handle] and /profile stat cards. A handle that matches
 * nothing returns zeros (never 404s - the UI renders a stub).
 */
export async function GET(req: Request) {
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

  const [{ data: stats, error: e1 }, { data: countries, error: e2 }] = await Promise.all([
    sb.rpc('owner_stats', { p_owner: address }),
    sb.rpc('owner_countries', { p_owner: address }),
  ]);
  const err = e1 ?? e2;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const s = (stats as Array<{
    hex_count: number;
    country_count: number;
    total_spent_usd: number;
    first_claim_at: string | null;
    last_claim_at: string | null;
  }> | null)?.[0];

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
    byCountry: ((countries ?? []) as Array<{
      country_iso: string;
      country_name: string | null;
      hex_count: number;
      total_spent_usd: number;
    }>).map((c) => ({
      iso: c.country_iso.toLowerCase(),
      name: c.country_name ?? c.country_iso,
      hexes: Number(c.hex_count),
      spentUsd: Number(c.total_spent_usd),
    })),
  });
}
