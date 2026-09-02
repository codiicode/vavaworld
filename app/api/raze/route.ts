import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getPublicClient, h3ToUint64, TILES_ABI, TILES_ADDRESS } from '@/lib/evm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ZERO = '0x0000000000000000000000000000000000000000';

/**
 * POST /api/raze { h3, owner, txHash? }
 *
 * Clears a razed hex out of the registry. The contract is the proof: the
 * hex must be UNOWNED on-chain now, and the registry row must have
 * belonged to the caller. Listings and bids on it are closed too - the
 * contract already deleted the ask and refunded any bid. The country's
 * claim count is left alone: the price curve only ever climbs.
 */
export async function POST(req: Request) {
  let body: { h3?: string; owner?: string; txHash?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { h3, owner } = body;
  if (!h3 || !owner) {
    return NextResponse.json({ error: 'h3, owner required' }, { status: 400 });
  }

  const hex = (await getPublicClient().readContract({
    address: TILES_ADDRESS,
    abi: TILES_ABI,
    functionName: 'hexes',
    args: [h3ToUint64(h3)],
  })) as [`0x${string}`, ...unknown[]] | { owner: `0x${string}` };
  const chainOwner = Array.isArray(hex) ? hex[0] : hex.owner;
  if (chainOwner && chainOwner !== ZERO) {
    return NextResponse.json({ error: 'hex is still owned on-chain' }, { status: 409 });
  }

  const sb = getServerSupabase();
  const { data: row } = await sb
    .from('hexes')
    .select('owner')
    .eq('h3_id', h3)
    .maybeSingle<{ owner: string }>();
  if (!row) return NextResponse.json({ ok: true, note: 'not in registry' });
  if (row.owner.toLowerCase() !== owner.toLowerCase()) {
    return NextResponse.json({ error: 'registry owner is not the caller' }, { status: 403 });
  }

  const now = new Date().toISOString();
  await sb.from('listings').update({ status: 'cancelled', closed_at: now }).eq('h3_id', h3).eq('status', 'active');
  await sb.from('bids').update({ status: 'cancelled', closed_at: now }).eq('h3_id', h3).eq('status', 'active');
  const { error } = await sb.from('hexes').delete().eq('h3_id', h3);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
