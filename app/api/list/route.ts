import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getPublicClient, h3ToUint64, TILES_ABI, TILES_ADDRESS } from '@/lib/evm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';
const ZERO = '0x0000000000000000000000000000000000000000';

/**
 * POST /api/list { h3, seller, priceSol }
 *
 * Mirrors an on-chain listing into the marketplace index. Intent is proven
 * by the CONTRACT, not a signed message: the seller must own the hex and
 * list() must already have set an ask. That keeps listing to a single
 * wallet prompt (the transaction) - no extra signature for the database.
 */
export async function POST(req: Request) {
  let body: { h3?: string; seller?: string; priceSol?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { h3, seller, priceSol } = body;
  if (!h3 || !seller || !priceSol) {
    return NextResponse.json({ error: 'h3, seller, priceSol required' }, { status: 400 });
  }

  const client = getPublicClient();
  const id = h3ToUint64(h3);
  const [hex, ask] = await Promise.all([
    client.readContract({ address: TILES_ADDRESS, abi: TILES_ABI, functionName: 'hexes', args: [id] }) as Promise<
      [`0x${string}`, ...unknown[]] | { owner: `0x${string}` }
    >,
    client.readContract({ address: TILES_ADDRESS, abi: TILES_ABI, functionName: 'listings', args: [id] }) as Promise<bigint>,
  ]);
  const owner = Array.isArray(hex) ? hex[0] : hex.owner;
  if (!owner || owner === ZERO || owner.toLowerCase() !== seller.toLowerCase()) {
    return NextResponse.json({ error: 'seller does not own this hex on-chain' }, { status: 403 });
  }
  if (ask === 0n) {
    return NextResponse.json({ error: 'hex is not listed on-chain yet' }, { status: 409 });
  }

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
