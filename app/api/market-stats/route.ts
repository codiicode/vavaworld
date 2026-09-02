import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const revalidate = 15;

/** GET /api/market-stats → real marketplace aggregates. */
export async function GET() {
  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('market_stats');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const s = (data as Array<{
    active_listings: number;
    floor_sol: number | null;
    sales_24h: number;
    volume_24h_sol: number;
  }> | null)?.[0];
  return NextResponse.json({
    activeListings: Number(s?.active_listings ?? 0),
    floorSol: s?.floor_sol != null ? Number(s.floor_sol) : null,
    sales24h: Number(s?.sales_24h ?? 0),
    volume24hSol: Number(s?.volume_24h_sol ?? 0),
  }, { headers: { 'Cache-Control': 'public, max-age=0, must-revalidate, s-maxage=30, stale-while-revalidate=120' } });
}
