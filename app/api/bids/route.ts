import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getPublicClient, h3ToUint64, TILES_ABI, TILES_ADDRESS } from '@/lib/evm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';

/**
 * POST /api/bids { h3, bidder }
 * Mirrors an ON-CHAIN bid escrow into the database and notifies the
 * owner. The escrow PDA is the source of truth: it only exists if the
 * bidder's SOL is actually locked, so no signature is needed here -
 * anyone can trigger the mirror, it can only mirror reality. Re-mirrors
 * of an unchanged escrow are no-ops (no duplicate notifications).
 */
export async function POST(req: Request) {
  let body: { h3?: string; bidder?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { h3, bidder } = body;
  if (!h3 || !bidder || !/^[0-9a-fA-F]{15,17}$/.test(h3)) {
    return NextResponse.json({ error: 'h3, bidder required' }, { status: 400 });
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(bidder)) {
    return NextResponse.json({ error: 'invalid bidder address' }, { status: 400 });
  }

  // Source of truth: the contract's bid escrow for this hex.
  const client = getPublicClient();
  const bid = (await client.readContract({
    address: TILES_ADDRESS,
    abi: TILES_ABI,
    functionName: 'bids',
    args: [h3ToUint64(h3)],
  })) as [`0x${string}`, bigint] | { bidder: `0x${string}`; amountWei: bigint };
  const escrowBidder = Array.isArray(bid) ? bid[0] : bid.bidder;
  const amountWei = Array.isArray(bid) ? bid[1] : bid.amountWei;
  if (escrowBidder.toLowerCase() !== bidder.toLowerCase()) {
    return NextResponse.json({ error: 'No on-chain bid escrow found for this hex/bidder' }, { status: 404 });
  }
  const priceSol = Number(amountWei) / 1e18; // native coin (ETH)
  if (priceSol <= 0) {
    return NextResponse.json({ error: 'Escrow is empty' }, { status: 400 });
  }

  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('place_bid', {
    p_h3: h3,
    p_bidder: bidder,
    p_price_sol: priceSol,
    p_secret: API_SECRET,
  });
  if (error) {
    return NextResponse.json({ error: error.message.replace(/^.*?: /, '') }, { status: 409 });
  }
  return NextResponse.json({ ok: true, bid: data });
}

/**
 * GET /api/bids?h3=... | ?bidder=... | ?owner=...
 * Active bids for one hex, placed by an address, or received across all
 * hexes an address owns (the "offers on my land" view).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const h3 = url.searchParams.get('h3');
  const bidder = url.searchParams.get('bidder');
  const owner = url.searchParams.get('owner');
  const sb = getServerSupabase();

  if (h3) {
    const { data, error } = await sb
      .from('bids')
      .select('*')
      .eq('h3_id', h3)
      .eq('status', 'active')
      .order('price_sol', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bids: data ?? [] });
  }
  if (bidder) {
    const { data, error } = await sb
      .from('bids')
      .select('*')
      .eq('bidder', bidder)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bids: data ?? [] });
  }
  if (owner) {
    const { data: hexes, error: hexErr } = await sb
      .from('hexes')
      .select('h3_id')
      .eq('owner', owner);
    if (hexErr) return NextResponse.json({ error: hexErr.message }, { status: 500 });
    const ids = (hexes ?? []).map((h) => h.h3_id);
    if (ids.length === 0) return NextResponse.json({ bids: [] });
    const { data, error } = await sb
      .from('bids')
      .select('*')
      .in('h3_id', ids)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bids: data ?? [] });
  }
  return NextResponse.json({ error: 'h3, bidder or owner required' }, { status: 400 });
}
