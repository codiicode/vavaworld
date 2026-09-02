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
const PAGE = 1000; // Supabase silently caps un-ranged selects at 1000 rows

export async function GET() {
  const sb = getServerSupabase();
  type Row = { h3_id: string; owner: string; purchase_price: number; claimed_at: string; image_url: string | null; tx_hash: string | null };
  const hexes: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('hexes')
      .select('h3_id, owner, purchase_price, claimed_at, image_url, tx_hash')
      .order('claimed_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      return NextResponse.json({ error: 'lookup failed' }, { status: 500 });
    }
    hexes.push(...((data ?? []) as Row[]));
    if ((data ?? []).length < PAGE) break;
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
        imageUrl: h.image_url ?? null,
        tx: h.tx_hash ?? null,
      })),
    },
    { headers: { 'Cache-Control': 'public, max-age=0, must-revalidate, s-maxage=15, stale-while-revalidate=60' } },
  );
}
