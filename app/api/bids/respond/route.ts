import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getServerSupabase } from '@/lib/supabase-server';
import { getRpcUrl } from '@/lib/anchor-client';
import { bidEscrowPda, tilePda } from '@/lib/tile-pda';
import {
  SECONDARY_FEE_BPS,
  TIERS,
  VAVA_UNIT,
} from '@/lib/tokenomics-constants';
import idl from '@/lib/anchor-idl.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';
const PROGRAM_ID = new PublicKey((idl as { address: string }).address);

async function sellerFeeBps(connection: Connection, seller: string): Promise<number> {
  try {
    const [stakePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('stake'), new PublicKey(seller).toBuffer()],
      PROGRAM_ID,
    );
    const info = await connection.getAccountInfo(stakePda);
    if (!info) return SECONDARY_FEE_BPS.standard;
    const amount = info.data.readBigUInt64LE(40);
    const baron = BigInt(TIERS.find((t) => t.key === 'baron')!.threshold) * BigInt(VAVA_UNIT);
    return amount >= baron ? SECONDARY_FEE_BPS.baron : SECONDARY_FEE_BPS.standard;
  } catch {
    return SECONDARY_FEE_BPS.standard;
  }
}

/**
 * POST /api/bids/respond { bidId, txSig }
 * Mirrors the on-chain resolution of a bid escrow. The chain decides
 * what happened - this endpoint just reads it:
 *  - escrow closed + tile owner == bidder  → accepted (settled sale)
 *  - escrow closed + tx signed by bidder   → cancelled (refunded)
 *  - escrow closed + tx signed by owner    → declined (refunded)
 * No wallet signature needed: the mirrored outcome is whatever already
 * happened on-chain, verified against the ledger.
 */
export async function POST(req: Request) {
  let body: { bidId?: string; txSig?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { bidId, txSig } = body;
  if (!bidId || !txSig) {
    return NextResponse.json({ error: 'bidId, txSig required' }, { status: 400 });
  }

  const sb = getServerSupabase();
  const { data: bid, error: bidErr } = await sb
    .from('bids')
    .select('*')
    .eq('id', bidId)
    .maybeSingle<{ id: string; h3_id: string; bidder: string; status: string }>();
  if (bidErr) return NextResponse.json({ error: bidErr.message }, { status: 500 });
  if (!bid) return NextResponse.json({ error: 'bid not found' }, { status: 404 });
  if (bid.status !== 'active') {
    return NextResponse.json({ ok: true, bid, note: 'already resolved' });
  }

  const connection = new Connection(getRpcUrl(), 'confirmed');
  const bidderPk = new PublicKey(bid.bidder);

  // The escrow must actually be resolved on-chain.
  const escrow = await connection.getAccountInfo(
    bidEscrowPda(bid.h3_id, bidderPk, PROGRAM_ID)[0],
  );
  if (escrow && escrow.data.length >= 48 && escrow.data.readBigUInt64LE(48) > 0n) {
    return NextResponse.json({ error: 'Bid escrow is still live on-chain' }, { status: 409 });
  }

  // Outcome 1: tile now belongs to the bidder → accepted + settled.
  const tileInfo = await connection.getAccountInfo(tilePda(bid.h3_id, PROGRAM_ID)[0]);
  const onchainOwner =
    tileInfo && tileInfo.data.length >= 40 ? new PublicKey(tileInfo.data.subarray(8, 40)) : null;

  if (onchainOwner && onchainOwner.equals(bidderPk)) {
    // Fee tier matches what the program charged: seller = pre-flip owner.
    const { data: hexRow } = await sb
      .from('hexes')
      .select('owner')
      .eq('h3_id', bid.h3_id)
      .maybeSingle<{ owner: string }>();
    const feeBps = hexRow ? await sellerFeeBps(connection, hexRow.owner) : SECONDARY_FEE_BPS.standard;

    const { data, error } = await sb.rpc('settle_bid_sale', {
      p_bid_id: bidId,
      p_tx_hash: txSig,
      p_fee_bps: feeBps,
      p_secret: API_SECRET,
    });
    if (error) {
      return NextResponse.json({ error: error.message.replace(/^.*?: /, '') }, { status: 409 });
    }
    return NextResponse.json({ ok: true, outcome: 'accepted', sale: data });
  }

  // Outcome 2/3: refunded - cancelled by the bidder or declined by the
  // owner. The transaction's fee payer tells us which.
  const tx = await connection.getTransaction(txSig, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });
  if (!tx || tx.meta?.err) {
    return NextResponse.json({ error: 'Transaction not found or failed' }, { status: 400 });
  }
  const keys = tx.transaction.message.getAccountKeys().staticAccountKeys.map((k) => k.toBase58());
  if (!keys.includes(PROGRAM_ID.toBase58())) {
    return NextResponse.json({ error: 'Transaction did not touch the program' }, { status: 400 });
  }
  const actor = keys[0];
  const action = actor === bid.bidder ? 'cancel' : 'decline';

  const { data, error } = await sb.rpc('respond_bid', {
    p_bid_id: bidId,
    p_actor: actor,
    p_action: action,
    p_secret: API_SECRET,
  });
  if (error) {
    return NextResponse.json({ error: error.message.replace(/^.*?: /, '') }, { status: 409 });
  }
  return NextResponse.json({ ok: true, outcome: action === 'cancel' ? 'cancelled' : 'declined', bid: data });
}
