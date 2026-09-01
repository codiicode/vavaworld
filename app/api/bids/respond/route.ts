import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getPublicClient, h3ToUint64, TILES_ABI, TILES_ADDRESS } from '@/lib/evm';
import { SECONDARY_FEE_BPS, TIERS, VAVA_UNIT } from '@/lib/tokenomics-constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';
const ZERO = '0x0000000000000000000000000000000000000000';

/** Baron sellers (>= 500k staked $VAVA on the contract) sell at 3%. */
async function sellerFeeBps(seller: string): Promise<number> {
  try {
    const client = getPublicClient();
    const s = (await client.readContract({
      address: TILES_ADDRESS,
      abi: TILES_ABI,
      functionName: 'stakes',
      args: [seller as `0x${string}`],
    })) as [bigint, bigint, bigint] | { amount: bigint };
    const amount = Array.isArray(s) ? s[0] : s.amount;
    const baronThreshold =
      BigInt(TIERS.find((t) => t.key === 'baron')!.threshold) * BigInt(VAVA_UNIT);
    return amount >= baronThreshold ? SECONDARY_FEE_BPS.baron : SECONDARY_FEE_BPS.standard;
  } catch {
    return SECONDARY_FEE_BPS.standard;
  }
}

/**
 * POST /api/bids/respond { bidId, txSig }
 * Mirrors the on-chain resolution of a bid. The CONTRACT decides what
 * happened - this route only reads the outcome:
 *  - bid slot cleared + hex owner == bidder → accepted (settled sale)
 *  - bid slot cleared + tx sent by bidder   → cancelled (refunded)
 *  - bid slot cleared + tx sent by owner    → declined (refunded)
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

  const client = getPublicClient();
  const h3u = h3ToUint64(bid.h3_id);

  // The escrow slot must actually be resolved on-chain.
  const live = (await client.readContract({
    address: TILES_ADDRESS,
    abi: TILES_ABI,
    functionName: 'bids',
    args: [h3u],
  })) as [`0x${string}`, bigint] | { bidder: `0x${string}`; amountWei: bigint };
  const liveBidder = Array.isArray(live) ? live[0] : live.bidder;
  if (liveBidder.toLowerCase() === bid.bidder.toLowerCase()) {
    return NextResponse.json({ error: 'Bid escrow is still live on-chain' }, { status: 409 });
  }

  // Outcome 1: hex now belongs to the bidder → accepted + settled.
  const hex = (await client.readContract({
    address: TILES_ADDRESS,
    abi: TILES_ABI,
    functionName: 'hexes',
    args: [h3u],
  })) as [`0x${string}`, ...unknown[]] | { owner: `0x${string}` };
  const onchainOwner = Array.isArray(hex) ? hex[0] : hex.owner;

  if (onchainOwner.toLowerCase() === bid.bidder.toLowerCase()) {
    // Fee tier matches what the contract charged: seller = pre-flip owner.
    const { data: hexRow } = await sb
      .from('hexes')
      .select('owner')
      .eq('h3_id', bid.h3_id)
      .maybeSingle<{ owner: string }>();
    const feeBps = hexRow ? await sellerFeeBps(hexRow.owner) : SECONDARY_FEE_BPS.standard;

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
  // owner. The transaction's sender tells us which.
  let from: string;
  let to: string;
  try {
    const tx = await client.getTransaction({ hash: txSig as `0x${string}` });
    from = tx.from;
    to = tx.to ?? ZERO;
  } catch {
    return NextResponse.json({ error: 'Transaction not found' }, { status: 400 });
  }
  if (to.toLowerCase() !== TILES_ADDRESS.toLowerCase()) {
    return NextResponse.json({ error: 'Transaction did not touch the contract' }, { status: 400 });
  }
  const action = from.toLowerCase() === bid.bidder.toLowerCase() ? 'cancel' : 'decline';

  const { data, error } = await sb.rpc('respond_bid', {
    p_bid_id: bidId,
    p_actor: from,
    p_action: action,
    p_secret: API_SECRET,
  });
  if (error) {
    return NextResponse.json({ error: error.message.replace(/^.*?: /, '') }, { status: 409 });
  }
  return NextResponse.json({
    ok: true,
    outcome: action === 'cancel' ? 'cancelled' : 'declined',
    bid: data,
  });
}
