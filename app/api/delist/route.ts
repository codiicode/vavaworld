import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { verifySignedAction } from '@/lib/server-verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';

/**
 * POST /api/delist { listingId, seller, message, signature }
 * Message: "vava:delist:<listingId>:<seller>:ts=<ms>"
 */
export async function POST(req: Request) {
  let body: { listingId?: string; seller?: string; message?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { listingId, seller, message, signature } = body;
  if (!listingId || !seller || !message || !signature) {
    return NextResponse.json({ error: 'listingId, seller, message, signature required' }, { status: 400 });
  }
  const sig = verifySignedAction({
    address: seller,
    message,
    signatureB58: signature,
    expectPrefix: `vava:delist:${listingId}:${seller}:`,
  });
  if (!sig.ok) return NextResponse.json({ error: sig.error }, { status: 401 });

  const sb = getServerSupabase();
  const { error } = await sb.rpc('cancel_listing', {
    p_listing_id: listingId,
    p_seller: seller,
    p_secret: API_SECRET,
  });
  if (error) {
    return NextResponse.json({ error: error.message.replace(/^.*?: /, '') }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
