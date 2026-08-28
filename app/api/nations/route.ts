import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { calculateFloor } from '@/lib/pricing';

export const runtime = 'nodejs';
export const revalidate = 30;

type CountryRow = {
  iso_code: string;
  name: string;
  claim_count: number;
  holder_count: number;
  total_spent_usd: number;
  top_owner: string | null;
  top_owner_username: string | null;
  top_owner_hexes: number | null;
};

/**
 * GET /api/nations → every country with real claim counts, live floor
 * (the locked primary formula) and the current top holder - the throne
 * candidate once presidents ship.
 */
export async function GET() {
  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('country_stats');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const nations = ((data ?? []) as CountryRow[]).map((r) => ({
    iso: r.iso_code.toLowerCase(),
    name: r.name,
    claims: Number(r.claim_count),
    holders: Number(r.holder_count),
    volumeUsd: Number(r.total_spent_usd),
    floorUsd: calculateFloor(Number(r.claim_count)),
    topOwner: r.top_owner,
    topOwnerUsername: r.top_owner_username,
    topOwnerHexes: Number(r.top_owner_hexes ?? 0),
  }));

  return NextResponse.json({ nations });
}
