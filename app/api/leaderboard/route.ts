import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getSolUsd } from '@/lib/sol-price';

export const runtime = 'nodejs';
export const revalidate = 30;

type LeaderboardRow = {
  owner: string;
  hex_count: number;
  country_count: number;
  total_spent_usd: number;
  last_claim_at: string;
  username: string | null;
  flag_country_code: string | null;
  avatar_url: string | null;
};

type MatrixRow = { owner: string; country_iso: string; purchase_price: number };

/**
 * GET /api/leaderboard → real per-owner rankings from the hexes table,
 * shaped like lib/mock-leaderboard's LeaderboardEntry so the existing
 * leaderboard UI renders it unchanged. Token-era fields (bonded,
 * volume24h, rankDelta) are 0 until those systems ship.
 */
export async function GET() {
  const SOL_USD = await getSolUsd();
  const sb = getServerSupabase();

  const [{ data: rows, error: e1 }, { data: matrix, error: e2 }, { data: globals, error: e3 }] =
    await Promise.all([
      sb.rpc('leaderboard_stats', { p_limit: 100 }),
      sb.from('hexes').select('owner,country_iso,purchase_price'),
      sb.rpc('global_stats'),
    ]);

  const err = e1 ?? e2 ?? e3;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const byOwner = new Map<string, { hexes: Record<string, number>; value: Record<string, number> }>();
  for (const m of (matrix ?? []) as MatrixRow[]) {
    const iso = m.country_iso.toLowerCase();
    let rec = byOwner.get(m.owner);
    if (!rec) {
      rec = { hexes: {}, value: {} };
      byOwner.set(m.owner, rec);
    }
    rec.hexes[iso] = (rec.hexes[iso] ?? 0) + 1;
    rec.value[iso] = (rec.value[iso] ?? 0) + Number(m.purchase_price) / SOL_USD;
  }

  const entries = ((rows ?? []) as LeaderboardRow[]).map((r, i) => {
    const per = byOwner.get(r.owner) ?? { hexes: {}, value: {} };
    const usd = Number(r.total_spent_usd);
    return {
      rank: i + 1,
      // Wallet-only players render as @<short-addr> until they pick a name.
      username: r.username ?? `${r.owner.slice(0, 4)}…${r.owner.slice(-4)}`,
      walletAddress: r.owner,
      country: r.flag_country_code ?? '',
      countryFlag: '',
      hexes: Number(r.hex_count),
      valueSOL: usd / SOL_USD,
      valueUSD: usd,
      volume24h: 0,
      countries: Number(r.country_count),
      bonded: 0,
      verified: Boolean(r.username),
      rankDelta: 0,
      hexesByCountry: per.hexes,
      bondedByCountry: {},
      valueByCountry: per.value,
      avatarUrl: r.avatar_url,
    };
  });

  const g = (globals as
    | Array<{ total_hexes: number; holder_count: number; active_countries: number; total_volume_usd: number }>
    | null)?.[0];

  return NextResponse.json({
    entries,
    totalHolders: Number(g?.holder_count ?? entries.length),
    totalHexes: Number(g?.total_hexes ?? 0),
    activeCountries: Number(g?.active_countries ?? 0),
    totalVolumeUsd: Number(g?.total_volume_usd ?? 0),
  }, { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' } });
}
