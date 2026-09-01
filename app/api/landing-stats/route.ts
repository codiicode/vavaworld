import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const revalidate = 30;

/** Total H3 cells at resolution 12: 2 + 120 * 7^12. */
const TOTAL_CELLS = 1_660_954_464_122;

type Globals = {
  total_hexes: number;
  holder_count: number;
  active_countries: number;
  total_volume_usd: number;
};

/**
 * GET /api/landing-stats → the figures the marketing page shows.
 *
 * The landing page shipped with invented numbers (12,847 claimed, a fake
 * leaderboard). This reads the same `global_stats` RPC the in-app
 * leaderboard uses, so the marketing copy can never drift from what the
 * product itself reports.
 */
export async function GET() {
  const sb = getServerSupabase();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();

  const [{ data: globals }, today, byCountry] = await Promise.all([
    sb.rpc('global_stats'),
    sb.from('hexes').select('*', { count: 'exact', head: true }).gte('claimed_at', dayAgo),
    sb.from('hexes').select('country_iso'),
  ]);

  const g = (globals as Globals[] | null)?.[0];
  const totalClaimed = Number(g?.total_hexes ?? 0);

  // Which country holds the most claimed ground.
  const counts = new Map<string, number>();
  for (const r of (byCountry.data ?? []) as Array<{ country_iso: string | null }>) {
    if (!r.country_iso) continue;
    const iso = r.country_iso.toLowerCase();
    counts.set(iso, (counts.get(iso) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  return NextResponse.json({
    claimedToday: today.count ?? 0,
    totalClaimed,
    tilesRemaining: TOTAL_CELLS - totalClaimed,
    totalCells: TOTAL_CELLS,
    holders: Number(g?.holder_count ?? 0),
    activeCountries: Number(g?.active_countries ?? 0),
    topNationIso: top?.[0] ?? null,
    topNationHexes: top?.[1] ?? 0,
  }, { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } });
}
