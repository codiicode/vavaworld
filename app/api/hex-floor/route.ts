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
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'lookup failed' },
      { status: 500 },
    );
  }
}
