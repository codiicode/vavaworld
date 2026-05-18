import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { calculateFloor } from '@/lib/pricing';
import { countryCentroid } from '@/lib/geo/country-resolver';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/countries → every country that has at least one claim, with its
 * live floor. Powers the zoomed-out (zoom < 13) country aggregate layer.
 */
export async function GET() {
  const sb = getServerSupabase();
  const { data, error } = await sb
    .from('countries')
    .select('iso_code,name,claim_count')
    .gt('claim_count', 0)
    .order('claim_count', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const countries = (data ?? [])
    .map((c) => ({
      iso: c.iso_code,
      name: c.name,
      claimCount: c.claim_count,
      floor: calculateFloor(c.claim_count),
      centroid: countryCentroid(c.iso_code),
    }))
    .filter((c) => c.centroid !== null);
  return NextResponse.json({ countries }, { headers: { 'Cache-Control': 'no-store' } });
}
