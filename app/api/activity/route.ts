import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { SOL_USD } from '@/lib/pricing';

export const runtime = 'nodejs';
export const revalidate = 15;

type ClaimRow = {
  h3_id: string;
  owner: string;
  username: string | null;
  country_iso: string;
  country_name: string | null;
  purchase_price: number;
  claimed_at: string;
};

type SaleRow = {
  h3_id: string;
  seller: string;
  seller_username: string | null;
  buyer: string;
  buyer_username: string | null;
  country_iso: string;
  country_name: string | null;
  price_sol: number;
  sold_at: string;
};

/**
 * GET /api/activity → the real event feed: primary claims + secondary
 * sales, merged newest-first.
 */
export async function GET() {
  const sb = getServerSupabase();
  const [{ data: claims, error: e1 }, { data: sales, error: e2 }] = await Promise.all([
    sb.rpc('recent_claims', { p_limit: 60 }),
    sb.rpc('recent_sales', { p_limit: 60 }),
  ]);
  const err = e1 ?? e2;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const claimEvents = ((claims ?? []) as ClaimRow[]).map((r) => ({
    type: 'claim' as const,
    h3Id: r.h3_id,
    from: null as string | null,
    fromUsername: null as string | null,
    to: r.owner,
    toUsername: r.username,
    countryIso: r.country_iso.toLowerCase(),
    countryName: r.country_name ?? r.country_iso,
    priceSol: Number(r.purchase_price) / SOL_USD,
    at: r.claimed_at,
  }));

  const saleEvents = ((sales ?? []) as SaleRow[]).map((r) => ({
    type: 'sale' as const,
    h3Id: r.h3_id,
    from: r.seller,
    fromUsername: r.seller_username,
    to: r.buyer,
    toUsername: r.buyer_username,
    countryIso: r.country_iso.toLowerCase(),
    countryName: r.country_name ?? r.country_iso,
    priceSol: Number(r.price_sol),
    at: r.sold_at,
  }));

  const events = [...claimEvents, ...saleEvents]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 80);

  return NextResponse.json({ events });
}
