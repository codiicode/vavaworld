import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { verifySignedAction } from '@/lib/server-verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';

/**
 * POST /api/bids/respond { bidId, actor, action, message, signature }
 * Message: "vava:bid-<action>:<bidId>:<actor>:ts=<ms>"
 * accept/decline require the hex owner's signature, cancel the bidder's -
 * enforced atomically in SQL (respond_bid). Accepting creates a listing
 * reserved for the bidder at the bid price.
 */
export async function POST(req: Request) {
  let body: {
    bidId?: string;
    actor?: string;
    action?: string;
    message?: string;
    signature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { bidId, actor, action, message, signature } = body;
  if (!bidId || !actor || !action || !message || !signature) {
    return NextResponse.json(
      { error: 'bidId, actor, action, message, signature required' },
      { status: 400 },
    );
  }
  if (!['accept', 'decline', 'cancel'].includes(action)) {
    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
  }
  const sig = verifySignedAction({
    address: actor,
    message,
    signatureB58: signature,
    expectPrefix: `vava:bid-${action}:${bidId}:${actor}:`,
  });
  if (!sig.ok) return NextResponse.json({ error: sig.error }, { status: 401 });

  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('respond_bid', {
    p_bid_id: bidId,
    p_actor: actor,
    p_action: action,
    p_secret: API_SECRET,
  });
  if (error) {
    return NextResponse.json({ error: error.message.replace(/^.*?: /, '') }, { status: 409 });
  }
  return NextResponse.json({ ok: true, bid: data });
}
