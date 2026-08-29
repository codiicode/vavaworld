import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getServerSupabase } from '@/lib/supabase-server';
import { getRpcUrl } from '@/lib/anchor-client';
import { bidEscrowPda } from '@/lib/tile-pda';
import idl from '@/lib/anchor-idl.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';
const PROGRAM_ID = new PublicKey((idl as { address: string }).address);

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
  let bidderPk: PublicKey;
  try {
    bidderPk = new PublicKey(bidder);
  } catch {
    return NextResponse.json({ error: 'invalid bidder address' }, { status: 400 });
  }

  // Source of truth: the escrow PDA and its locked amount.
  const connection = new Connection(getRpcUrl(), 'confirmed');
  const escrow = await connection.getAccountInfo(bidEscrowPda(h3, bidderPk, PROGRAM_ID)[0]);
  if (!escrow || !escrow.owner.equals(PROGRAM_ID) || escrow.data.length < 48) {
    return NextResponse.json({ error: 'No on-chain bid escrow found for this hex/bidder' }, { status: 404 });
  }
  // BidEscrow layout: 8 disc + 32 bidder + 8 h3 + 8 amount (LE)
  const escrowBidder = new PublicKey(escrow.data.subarray(8, 40));
  if (!escrowBidder.equals(bidderPk)) {
    return NextResponse.json({ error: 'Escrow bidder mismatch' }, { status: 400 });
  }
  const amount = escrow.data.readBigUInt64LE(48);
  const priceSol = Number(amount) / 1e9;
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
