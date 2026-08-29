import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/claimed → every claimed hex with owner + username.
 *
 * The map's "taken" overlay and the selection panel need claimed status for
 * OFF-CHAIN claims (Supabase is the primary-claim ledger today; the on-chain
 * PDA check misses these entirely). Claims are sparse, so the whole registry
 * is a few KB - clients fetch it once and look up locally, which beats any
 * per-hex or per-viewport endpoint until the indexer ships a bbox query.
 */
export async function GET() {
  const sb = getServerSupabase();
  const { data: hexes, error } = await sb
    .from('hexes')
    .select('h3_id, owner, purchase_price, claimed_at');
  if (error) {
    return NextResponse.json({ error: 'lookup failed' }, { status: 500 });
  }
  const owners = Array.from(new Set((hexes ?? []).map((h) => h.owner)));
  const nameByAddr = new Map<string, string | null>();
  if (owners.length > 0) {
    const { data: profiles } = await sb
      .from('profiles')
      .select('wallet_address, username')
      .in('wallet_address', owners);
    for (const p of profiles ?? []) nameByAddr.set(p.wallet_address, p.username);
  }
  return NextResponse.json(
    {
      hexes: (hexes ?? []).map((h) => ({
        h3: h.h3_id,
        owner: h.owner,
        username: nameByAddr.get(h.owner) ?? null,
        priceUsd: Number(h.purchase_price),
        claimedAt: h.claimed_at,
      })),
    },
    { headers: { 'Cache-Control': 's-maxage=15, stale-while-revalidate=60' } },
  );
}
