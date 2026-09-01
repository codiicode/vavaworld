import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { verifySignedAction } from '@/lib/server-verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';

/**
 * POST /api/list { h3, seller, priceSol, message, signature }
 * Message: "vava:list:<h3>:<priceSol>:<seller>:ts=<ms>"
 * Ownership is enforced atomically in SQL (create_listing); the wallet
 * signature proves the seller actually asked for it.
 */
export async function POST(req: Request) {
  let body: {
    h3?: string;
    seller?: string;
    priceSol?: number;
    message?: string;
    signature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { h3, seller, priceSol, message, signature } = body;
  if (!h3 || !seller || !priceSol || !message || !signature) {
    return NextResponse.json({ error: 'h3, seller, priceSol, message, signature required' }, { status: 400 });
  }
  const sig = await verifySignedAction({
    address: seller,
    message,
    signatureB58: signature,
    expectPrefix: `vava:list:${h3}:${priceSol}:${seller}:`,
  });
  if (!sig.ok) return NextResponse.json({ error: sig.error }, { status: 401 });

  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('create_listing', {
    p_h3: h3,
    p_seller: seller,
    p_price_sol: priceSol,
    p_secret: API_SECRET,
  });
  if (error) {
    return NextResponse.json({ error: error.message.replace(/^.*?: /, '') }, { status: 409 });
  }
  return NextResponse.json({ ok: true, listing: data });
}
