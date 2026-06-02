import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { calculateFloor } from '@/lib/pricing';
import { countryCentroid } from '@/lib/geo/country-resolver';

export const runtime = 'nodejs';
// Slowly-changing aggregates (claim counts per country). Let the CDN serve it:
// first hit pays the Supabase round-trip (~1.2s), everyone else gets an instant
// edge response, and after 60s stale-while-revalidate refreshes in the
// background so a load is never blocked on it. The client throttles to 10s too.
export const revalidate = 60;

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
  return NextResponse.json(
    { countries },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } },
  );
}
