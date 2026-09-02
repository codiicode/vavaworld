import { NextResponse } from 'next/server';
import { getEthUsd } from '@/lib/eth-price';

export const runtime = 'nodejs';
export const revalidate = 30;

/** GET /api/eth-price → live ETH/USD (Chainlink → Coinbase fallback, cached). */
export async function GET() {
  return NextResponse.json(
    { ethUsd: await getEthUsd() },
    { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' } },
  );
}
