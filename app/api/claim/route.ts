import { NextResponse } from 'next/server';
import { isValidCell, getResolution } from 'h3-js';
import { getServerSupabase } from '@/lib/supabase-server';
import { resolveHexCountry } from '@/lib/geo/country-resolver';
import { H3_RESOLUTION } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/claim  { h3, owner, txHash?, quotedPriceUsd? }
 *
 * Resolves the hex → country and invokes the atomic `claim_hex` SQL function:
 * it locks the country row, validates a 2%-tolerance slippage check if
 * `quotedPriceUsd` was supplied, inserts the hex at the floor that existed
 * BEFORE this claim, increments the country's count, and stores `tx_hash` +
 * `claim_count_at_purchase` for observability — all in one transaction.
 *
 * Translates DB errors to HTTP:
 *   stale_quote (P0001)            → 409 { code: 'stale_quote', currentFloor? }
 *   unique_violation (23505)       → 409 { code: 'already_claimed' }
 *   anything else                  → 500
 */
export async function POST(req: Request) {
  let body: {
    h3?: unknown;
    owner?: unknown;
    txHash?: unknown;
    quotedPriceUsd?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const h3 = typeof body.h3 === 'string' ? body.h3.trim() : '';
  const owner = typeof body.owner === 'string' ? body.owner.trim() : '';
  const txHash =
    typeof body.txHash === 'string' && body.txHash.trim().length > 0
      ? body.txHash.trim()
      : null;
  const quotedPriceUsd =
    typeof body.quotedPriceUsd === 'number' && Number.isFinite(body.quotedPriceUsd)
      ? body.quotedPriceUsd
      : null;

  if (!h3 || !isValidCell(h3)) {
    return NextResponse.json({ error: 'invalid h3 id' }, { status: 400 });
  }
  if (getResolution(h3) !== H3_RESOLUTION) {
    return NextResponse.json(
      { error: `hex must be H3 resolution ${H3_RESOLUTION}` },
      { status: 400 },
    );
  }
  if (!owner) {
    return NextResponse.json({ error: 'owner required' }, { status: 400 });
  }

  const countryIso = resolveHexCountry(h3);

  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('claim_hex', {
    p_h3: h3,
    p_country_iso: countryIso,
    p_owner: owner,
    p_tx_hash: txHash,
    p_quoted_price_usd: quotedPriceUsd,
  });

  if (error) {
    const msg = error.message ?? '';
    if (error.code === '23505' || /already claimed/i.test(msg)) {
      return NextResponse.json(
        { error: 'hex already claimed', code: 'already_claimed' },
        { status: 409 },
      );
    }
    if (/stale quote/i.test(msg)) {
      return NextResponse.json(
        { error: msg, code: 'stale_quote' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, ...data },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
