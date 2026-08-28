import { NextResponse } from 'next/server';
import { getCountryState } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/country-count?iso=DE → { iso, claimCount, currentFloor } */
export async function GET(req: Request) {
  const iso = new URL(req.url).searchParams.get('iso')?.trim().toUpperCase() ?? '';
  if (!iso) {
    return NextResponse.json({ error: 'iso required' }, { status: 400 });
  }
  const state = await getCountryState(iso);
  return NextResponse.json(
    {
      iso: state.countryIso,
      name: state.countryName,
      claimCount: state.claimCount,
      currentFloor: state.floor,
    },
    { headers: { 'Cache-Control': 's-maxage=10, stale-while-revalidate=60' } },
  );
}
