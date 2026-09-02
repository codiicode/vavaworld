import { NextResponse } from 'next/server';
import { getSolUsd } from '@/lib/sol-price';

export const runtime = 'nodejs';
export const revalidate = 30;

/** GET /api/sol-price → live ETH/USD under the legacy solUsd field. */
export async function GET() {
  return NextResponse.json(
    { solUsd: await getSolUsd() },
    { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' } },
  );
}
