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
  const [{ data, error }, { data: thrones }] = await Promise.all([
    sb.rpc('country_stats'),
    sb.from('thrones').select('country_iso,holder'),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const throneBy = new Map(
    ((thrones ?? []) as Array<{ country_iso: string; holder: string }>).map((t) => [
      t.country_iso,
      t.holder,
    ]),
  );

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
    president: throneBy.get(r.iso_code) ?? null,
  }));

  return NextResponse.json(
    { nations },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } },
  );
}
