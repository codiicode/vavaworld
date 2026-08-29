import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { verifySignedAction } from '@/lib/server-verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';

/**
 * POST /api/bids { h3, bidder, priceSol, message, signature }
 * Message: "vava:bid:<h3>:<priceSol>:<bidder>:ts=<ms>"
 * Bids are free signed intents (no escrow) - money only moves when an
 * accepted bid is settled through /api/buy's verified payment path.
 */
export async function POST(req: Request) {
  let body: {
    h3?: string;
    bidder?: string;
    priceSol?: number;
    message?: string;
    signature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { h3, bidder, priceSol, message, signature } = body;
  if (!h3 || !bidder || !priceSol || !message || !signature) {
    return NextResponse.json(
      { error: 'h3, bidder, priceSol, message, signature required' },
      { status: 400 },
    );
  }
  const sig = verifySignedAction({
    address: bidder,
    message,
    signatureB58: signature,
    expectPrefix: `vava:bid:${h3}:${priceSol}:${bidder}:`,
  });
  if (!sig.ok) return NextResponse.json({ error: sig.error }, { status: 401 });

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
