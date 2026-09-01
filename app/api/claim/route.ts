import { NextResponse } from 'next/server';
import { isValidCell, getResolution } from 'h3-js';
import { Connection, PublicKey } from '@solana/web3.js';
import { getServerSupabase } from '@/lib/supabase-server';
import { resolveHexCountry } from '@/lib/geo/country-resolver';
import { H3_RESOLUTION } from '@/lib/pricing';
import { getSolUsd } from '@/lib/sol-price';
import { getRpcUrl } from '@/lib/anchor-client';
import idl from '@/lib/anchor-idl.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TREASURY = process.env.NEXT_PUBLIC_TREASURY ?? '74fWA4NXGtv7RJEd9oTJk9vjqZCTMz2W1s5soCvC6b4X';
const PROGRAM_ID = new PublicKey((idl as { address: string }).address);
const API_SECRET = process.env.INDEXER_API_SECRET ?? '';
const MAX_TX_AGE_SECS = 15 * 60;

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

  const connection = new Connection(getRpcUrl(), 'confirmed');
  let paidUsd: number | null = null;
  let effectiveTx: string;

  if (txHash) {
    // ---- Payment path: verify the SOL payment on-chain ----
    const tx = await connection.getTransaction(txHash, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    if (!tx || tx.meta?.err) {
      return NextResponse.json({ error: 'payment tx not found or failed' }, { status: 400 });
    }
    if (tx.blockTime && Date.now() / 1000 - tx.blockTime > MAX_TX_AGE_SECS) {
      return NextResponse.json({ error: 'payment tx too old' }, { status: 400 });
    }
    const keys = tx.transaction.message.getAccountKeys().staticAccountKeys.map((k) => k.toBase58());
    if (keys[0] !== owner) {
      return NextResponse.json({ error: 'payment not signed by owner' }, { status: 400 });
    }
    const ti = keys.indexOf(TREASURY);
    const paidLamports = ti >= 0 ? tx.meta!.postBalances[ti] - tx.meta!.preBalances[ti] : 0;
    if (paidLamports <= 0) {
      return NextResponse.json({ error: 'no payment to treasury in tx' }, { status: 400 });
    }
    const solUsd = await getSolUsd();
    paidUsd = (paidLamports / 1e9) * solUsd;
    effectiveTx = txHash;
  } else {
    // ---- Mirror path: hex was claimed through the on-chain program ----
    const [tilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('hex'), h3IdToLeBytes(h3)],
      PROGRAM_ID,
    );
    const info = await connection.getAccountInfo(tilePda);
    if (!info || !info.owner.equals(PROGRAM_ID)) {
      return NextResponse.json(
        { error: 'no payment tx and no on-chain hex to mirror' },
        { status: 400 },
      );
    }
    // Tile layout: 8 disc + 32 owner …
    const tileOwner = new PublicKey(info.data.subarray(8, 40)).toBase58();
    if (tileOwner !== owner) {
      return NextResponse.json({ error: 'on-chain hex not owned by owner' }, { status: 403 });
    }
    effectiveTx = `mirror:${h3}`;
  }

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
function h3IdToLeBytes(h3: string): Buffer {
  const big = BigInt('0x' + h3);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(big);
  return buf;
}
