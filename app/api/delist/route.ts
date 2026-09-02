import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getPublicClient, h3ToUint64, TILES_ABI, TILES_ADDRESS } from '@/lib/evm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';

/**
 * POST /api/delist { listingId, seller }
 *
 * Closes the marketplace row once the on-chain ask is gone. Intent is
 * proven by the contract: the caller must own the hex and listings(h3)
 * must already be 0 (delist() ran, or the hex was sold/razed).
 */
export async function POST(req: Request) {
  let body: { listingId?: string; seller?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { listingId, seller } = body;
  if (!listingId || !seller) {
    return NextResponse.json({ error: 'listingId, seller required' }, { status: 400 });
  }

  const sb = getServerSupabase();
  const { data: row, error: lookupError } = await sb
    .from('listings')
    .select('h3_id, seller')
    .eq('id', listingId)
    .maybeSingle<{ h3_id: string; seller: string }>();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!row) return NextResponse.json({ error: 'listing not found' }, { status: 404 });
  if (row.seller.toLowerCase() !== seller.toLowerCase()) {
    return NextResponse.json({ error: 'not your listing' }, { status: 403 });
  }

  const client = getPublicClient();
  const id = h3ToUint64(row.h3_id);
  const [hex, ask] = await Promise.all([
    client.readContract({ address: TILES_ADDRESS, abi: TILES_ABI, functionName: 'hexes', args: [id] }) as Promise<
      [`0x${string}`, ...unknown[]] | { owner: `0x${string}` }
    >,
    client.readContract({ address: TILES_ADDRESS, abi: TILES_ABI, functionName: 'listings', args: [id] }) as Promise<bigint>,
  ]);
  const owner = Array.isArray(hex) ? hex[0] : hex.owner;
  // A sold/razed hex no longer belongs to the seller - the row may still
  // be closed by them, since the on-chain ask is gone either way.
  if (ask !== 0n && owner.toLowerCase() === seller.toLowerCase()) {
    return NextResponse.json({ error: 'hex is still listed on-chain - delist first' }, { status: 409 });
  }

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
