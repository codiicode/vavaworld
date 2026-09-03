import { NextResponse } from 'next/server';
import { sweepStuckPayments } from '@/lib/foreign-payments';
import { SOLANA_PAY_ENABLED } from '@/lib/solana-pay-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/solana-pay/sweep  (keeper only, x-keeper-secret header)
 *
 * Re-drives foreign payments whose ETH funding never landed - a user who
 * closed the tab mid-flow, an RPC hiccup after verification, a crash
 * between "sent" and "confirmed". Idempotent; the keeper calls it every
 * pass.
 */
export async function POST(req: Request) {
  if (!SOLANA_PAY_ENABLED) return NextResponse.json({ swept: 0, disabled: true });
  const secret = process.env.INDEXER_API_SECRET ?? '';
  if (!secret || req.headers.get('x-keeper-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const swept = await sweepStuckPayments();
    return NextResponse.json({ swept });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'sweep failed' }, { status: 500 });
  }
}
