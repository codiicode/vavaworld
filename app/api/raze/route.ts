import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getPublicClient, h3ToUint64, TILES_ABI, TILES_ADDRESS } from '@/lib/evm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ZERO = '0x0000000000000000000000000000000000000000';
const API_SECRET = process.env.INDEXER_API_SECRET ?? '';

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
  let body: { h3?: string; h3s?: string[]; owner?: string; txHash?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const owner = body.owner;
  const h3s = body.h3s ?? (body.h3 ? [body.h3] : []);
  if (h3s.length === 0 || h3s.length > 500 || !owner) {
    return NextResponse.json({ error: 'h3/h3s (max 500) and owner required' }, { status: 400 });
  }

  const client = getPublicClient();
  const sb = getServerSupabase();
  const results: Array<{ h3: string; ok: boolean; error?: string }> = [];
  const CHUNK = 25;
  for (let i = 0; i < h3s.length; i += CHUNK) {
    await Promise.all(
      h3s.slice(i, i + CHUNK).map(async (h3) => {
        try {
          const hex = (await client.readContract({
            address: TILES_ADDRESS,
            abi: TILES_ABI,
            functionName: 'hexes',
            args: [h3ToUint64(h3)],
          })) as [`0x${string}`, ...unknown[]] | { owner: `0x${string}` };
          const chainOwner = Array.isArray(hex) ? hex[0] : hex.owner;
          if (chainOwner && chainOwner !== ZERO) {
            results.push({ h3, ok: false, error: 'still owned on-chain' });
            return;
          }
          // The server talks to Supabase with the anon key, so table writes
          // are RLS-gated; mutations go through a SECURITY DEFINER function
          // guarded by the API secret, like the rest of the mirror.
          const { error } = await sb.rpc('raze_hex', {
            p_h3: h3,
            p_owner: owner,
            p_secret: API_SECRET,
          });
          if (error) results.push({ h3, ok: false, error: error.message.replace(/^.*?: /, '') });
          else results.push({ h3, ok: true });
        } catch (e) {
          results.push({ h3, ok: false, error: e instanceof Error ? e.message.slice(0, 120) : 'failed' });
        }
      }),
    );
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length === results.length) {
    return NextResponse.json({ error: failed[0]?.error ?? 'raze mirror failed', results }, { status: 409 });
  }
  return NextResponse.json({ ok: true, cleared: results.length - failed.length, failed });
}
