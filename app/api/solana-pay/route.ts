import { NextResponse } from 'next/server';
import { settleForeignPayment } from '@/lib/foreign-payments';
import { SOLANA_PAY_ENABLED } from '@/lib/solana-pay-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/solana-pay { paymentId, signature }
 *
 * The client paid the treasury on Solana; verify it and fund the payer's
 * EVM wallet. Returns `retry: true` while the Solana tx is still
 * finalizing - the client polls. Idempotent: re-posting a funded payment
 * returns the same fund tx.
 */
export async function POST(req: Request) {
  if (!SOLANA_PAY_ENABLED) {
    return NextResponse.json({ error: 'Solana payments are not enabled' }, { status: 503 });
  }
  let body: { paymentId?: unknown; signature?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const paymentId = typeof body.paymentId === 'string' ? body.paymentId.trim() : '';
  const signature = typeof body.signature === 'string' ? body.signature.trim() : '';
  if (!/^[0-9a-f]{24}$/.test(paymentId) || !/^[1-9A-HJ-NP-Za-km-z]{60,100}$/.test(signature)) {
    return NextResponse.json({ error: 'paymentId and signature required' }, { status: 400 });
  }
  try {
    const r = await settleForeignPayment(paymentId, signature);
    if (r.status === 'retry') return NextResponse.json({ retry: true, reason: r.reason }, { status: 202 });
    if (r.status === 'failed') return NextResponse.json({ error: r.reason }, { status: 400 });
    return NextResponse.json({ ok: true, fundTx: r.fundTx });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'settlement failed' },
      { status: 500 },
    );
  }
}
