import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { SOL_USD } from '@/lib/pricing';

export const runtime = 'nodejs';
export const revalidate = 15;

type ClaimRow = {
  h3_id: string;
  owner: string;
  username: string | null;
  country_iso: string;
  country_name: string | null;
  purchase_price: number;
  claimed_at: string;
};

/**
 * GET /api/activity → the real claim feed (newest first). Only primary
 * claims exist today; marketplace sells join the feed when the
 * secondary program ships.
 */
export async function GET() {
  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('recent_claims', { p_limit: 60 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const events = ((data ?? []) as ClaimRow[]).map((r) => ({
    type: 'claim' as const,
    h3Id: r.h3_id,
    owner: r.owner,
    username: r.username,
    countryIso: r.country_iso.toLowerCase(),
    countryName: r.country_name ?? r.country_iso,
    priceUsd: Number(r.purchase_price),
    priceSol: Number(r.purchase_price) / SOL_USD,
    claimedAt: r.claimed_at,
  }));

  return NextResponse.json({ events });
}
