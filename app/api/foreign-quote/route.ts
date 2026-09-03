import { NextResponse } from 'next/server';
import { createForeignQuote } from '@/lib/foreign-payments';
import { getEthUsd } from '@/lib/eth-price';
import { SOLANA_PAY_ENABLED, isForeignCurrency } from '@/lib/solana-pay-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/foreign-quote { purpose: 'buy' | 'bid', payer, wei, reference, currency }
 *
 * Prices a marketplace action (an ETH ask or a bid amount) in SOL/USDC
 * and opens a foreign payment for it. Claims use /api/quote instead,
 * which prices the basket itself.
 */
const MAX_WEI = 10n ** 20n; // 100 ETH - nobody buys a hex for more

export async function POST(req: Request) {
  if (!SOLANA_PAY_ENABLED) {
    return NextResponse.json({ error: 'Solana payments are not enabled' }, { status: 503 });
  }
  let body: { purpose?: unknown; payer?: unknown; wei?: unknown; reference?: unknown; currency?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const purpose = body.purpose === 'buy' || body.purpose === 'bid' ? body.purpose : null;
  const payer = typeof body.payer === 'string' && /^0x[0-9a-fA-F]{40}$/.test(body.payer) ? body.payer : null;
  const reference = typeof body.reference === 'string' ? body.reference.slice(0, 120) : '';
  const currency = isForeignCurrency(body.currency) ? body.currency : null;
  let wei: bigint;
  try {
    wei = BigInt(String(body.wei));
  } catch {
    wei = 0n;
  }
  if (!purpose || !payer || !currency || wei <= 0n || wei > MAX_WEI) {
    return NextResponse.json({ error: 'purpose, payer, wei, currency required' }, { status: 400 });
  }
  try {
    const ethUsd = await getEthUsd();
    const usd = (Number(wei) / 1e18) * ethUsd;
    const foreign = await createForeignQuote({
      purpose,
      reference,
      payerEvm: payer,
      usd,
      weiNeeded: wei,
      currency,
    });
    return NextResponse.json({ foreign, ethUsd });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'quote failed' }, { status: 500 });
  }
}
