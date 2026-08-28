import { NextResponse } from 'next/server';
import { isValidCell, getResolution } from 'h3-js';
import { getHexFloor, H3_RESOLUTION } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/hex-floor?h3=<id> → floor + country + claim metadata. */
export async function GET(req: Request) {
  const h3 = new URL(req.url).searchParams.get('h3')?.trim() ?? '';
  if (!h3 || !isValidCell(h3)) {
    return NextResponse.json({ error: 'invalid h3 id' }, { status: 400 });
  }
  if (getResolution(h3) !== H3_RESOLUTION) {
    return NextResponse.json(
      { error: `hex must be H3 resolution ${H3_RESOLUTION}` },
      { status: 400 },
    );
  }
  try {
    const data = await getHexFloor(h3);
    // CDN-cache per hex: clients poll their selected hex on an interval, so
    // s-maxage collapses every browser's polls into ~1 origin hit per window
    // and stale-while-revalidate keeps responses instant while refreshing.
    // The floor moves $0.00001 per claim - seconds of staleness is invisible.
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 's-maxage=5, stale-while-revalidate=30' },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'lookup failed' },
      { status: 500 },
    );
  }
}
