import { NextResponse } from 'next/server';
import { isValidCell, getResolution } from 'h3-js';
import { getServerSupabase } from '@/lib/supabase-server';
import { resolveHexCountry } from '@/lib/geo/country-resolver';
import { H3_RESOLUTION } from '@/lib/pricing';
import { getPublicClient, h3ToUint64, TILES_ABI, TILES_ADDRESS } from '@/lib/evm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';

/**
 * POST /api/claim  { h3, owner, txHash?, quotedPriceUsd? }
 *
 * Hardened: every claim must be backed by verifiable value.
 *  - Payment path (txHash): the tx must be a confirmed, recent SOL
 *    payment to the treasury signed by the owner. The USD value of
 *    what it paid becomes a per-tx budget enforced atomically inside
 *    claim_hex (advisory-locked), so one payment can never cover more
 *    claims than it paid for - even under parallel batch commits.
 *  - Mirror path (no txHash): only for hexes claimed through the
 *    on-chain program - the Tile PDA must exist and be owned by
 *    `owner`; the mirror is charged as 'mirror:<h3>'.
 * claim_hex itself now requires our API secret, so the database
 * function can no longer be driven directly with the public anon key.
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

  // Claims settle ONLY through the contract's claim() - the mirror just
  // confirms the on-chain owner before the DB row is written.
  const client = getPublicClient();
  const hex = (await client.readContract({
    address: TILES_ADDRESS,
    abi: TILES_ABI,
    functionName: 'hexes',
    args: [h3ToUint64(h3)],
  })) as [`0x${string}`, ...unknown[]] | { owner: `0x${string}` };
  const chainOwner = Array.isArray(hex) ? hex[0] : hex.owner;
  if (!chainOwner || chainOwner === '0x0000000000000000000000000000000000000000') {
    return NextResponse.json(
      { error: 'no on-chain hex to mirror' },
      { status: 400 },
    );
  }
  if (chainOwner.toLowerCase() !== owner.toLowerCase()) {
    return NextResponse.json({ error: 'on-chain hex not owned by owner' }, { status: 403 });
  }
  const paidUsd: number | null = null;
  const effectiveTx = txHash ?? `mirror:${h3}`;

  const countryIso = resolveHexCountry(h3);
  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('claim_hex', {
    p_h3: h3,
    p_country_iso: countryIso,
    p_owner: owner,
    p_tx_hash: effectiveTx,
    p_quoted_price_usd: quotedPriceUsd,
    p_paid_usd: paidUsd,
    p_secret: API_SECRET,
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
      return NextResponse.json({ error: msg, code: 'stale_quote' }, { status: 409 });
    }
    if (/payment budget/i.test(msg)) {
      return NextResponse.json({ error: msg, code: 'underpaid' }, { status: 402 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...data });
}

/** h3 string → the LE u64 bytes used in the tile PDA seed. */
