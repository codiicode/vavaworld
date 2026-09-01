import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getPublicClient, h3ToUint64, TILES_ABI, TILES_ADDRESS } from '@/lib/evm';
import { SECONDARY_FEE_BPS, TIERS, VAVA_UNIT } from '@/lib/tokenomics-constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';
/** Native-coin base unit used by the quote payload: 1e9 (gwei), so the
 *  client multiplies by 1e9 for wei. Kept "lamports"-named for UI compat. */
const UNITS = 1_000_000_000;

type Quote = {
  listingId: string;
  h3Id: string;
  seller: string;
  priceSol: number; // native coin (ETH) - field name kept for UI compat
  feeBps: number;
  transfers: Array<{ to: string; lamports: number; label: string }>;
  totalLamports: number;
  reservedFor: string | null;
};

/** Baron sellers (>= 500k staked $VAVA on the contract) sell at 3%. */
async function sellerFeeBps(seller: string): Promise<number> {
  try {
    const client = getPublicClient();
    const s = (await client.readContract({
      address: TILES_ADDRESS,
      abi: TILES_ABI,
      functionName: 'stakes',
      args: [seller as `0x${string}`],
    })) as [bigint, bigint, bigint] | { amount: bigint };
    const amount = Array.isArray(s) ? s[0] : s.amount;
    const baronThreshold =
      BigInt(TIERS.find((t) => t.key === 'baron')!.threshold) * BigInt(VAVA_UNIT);
    return amount >= baronThreshold ? SECONDARY_FEE_BPS.baron : SECONDARY_FEE_BPS.standard;
  } catch {
    return SECONDARY_FEE_BPS.standard;
  }
}

async function buildQuote(listingId: string): Promise<Quote | { error: string; status: number }> {
  const sb = getServerSupabase();
  const { data: listing, error } = await sb
    .from('listings')
    .select('id,h3_id,seller,price_sol,status,reserved_for')
    .eq('id', listingId)
    .maybeSingle<{
      id: string;
      h3_id: string;
      seller: string;
      price_sol: number;
      status: string;
      reserved_for: string | null;
    }>();
  if (error) return { error: error.message, status: 500 };
  if (!listing) return { error: 'Listing not found', status: 404 };
  if (listing.status !== 'active') return { error: 'Listing is not active', status: 409 };

  const feeBps = await sellerFeeBps(listing.seller);
  const total = Math.round(listing.price_sol * UNITS);
  const fee = Math.floor((total * feeBps) / 10_000);
  // Display-only breakdown: the CONTRACT enforces the real split when
  // buy() executes - nothing here can change what actually happens.
  return {
    listingId: listing.id,
    h3Id: listing.h3_id,
    seller: listing.seller,
    priceSol: listing.price_sol,
    feeBps,
    transfers: [
      { to: listing.seller, lamports: total - fee, label: 'seller' },
      { to: TILES_ADDRESS, lamports: fee, label: 'protocol' },
    ],
    totalLamports: total,
    reservedFor: listing.reserved_for,
  };
}

/** GET /api/buy?listingId= → price + fee breakdown for the confirm dialog. */
export async function GET(req: Request) {
  const listingId = new URL(req.url).searchParams.get('listingId');
  if (!listingId) return NextResponse.json({ error: 'listingId required' }, { status: 400 });
  const quote = await buildQuote(listingId);
  if ('error' in quote) return NextResponse.json({ error: quote.error }, { status: quote.status });
  return NextResponse.json(quote);
}

/**
 * POST /api/buy { listingId, buyer, txSig } → the buy() contract call is
 * ATOMIC (payment split + ownership flip on-chain), so verification is a
 * single source-of-truth read: the hex's on-chain owner must now be the
 * buyer. Then the sale is mirrored into Supabase. The old Solana flow's
 * transfer-verification and keeper sync_owner are gone - the contract
 * settles everything itself.
 */
export async function POST(req: Request) {
  let body: { listingId?: string; buyer?: string; txSig?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { listingId, buyer, txSig } = body;
  if (!listingId || !buyer || !txSig) {
    return NextResponse.json({ error: 'listingId, buyer, txSig required' }, { status: 400 });
  }

  const quote = await buildQuote(listingId);
  if ('error' in quote) return NextResponse.json({ error: quote.error }, { status: quote.status });

  const client = getPublicClient();
  const hex = (await client.readContract({
    address: TILES_ADDRESS,
    abi: TILES_ABI,
    functionName: 'hexes',
    args: [h3ToUint64(quote.h3Id)],
  })) as [`0x${string}`, ...unknown[]] | { owner: `0x${string}` };
  const owner = Array.isArray(hex) ? hex[0] : hex.owner;
  if (owner.toLowerCase() !== buyer.toLowerCase()) {
    return NextResponse.json(
      { error: 'On-chain owner is not the buyer - purchase not confirmed yet' },
      { status: 400 },
    );
  }

  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('settle_sale', {
    p_listing_id: listingId,
    p_buyer: buyer,
    p_tx_hash: txSig,
    p_fee_bps: quote.feeBps,
    p_secret: API_SECRET,
  });
  if (error) {
    const msg = error.message.includes('duplicate key')
      ? 'This transaction was already used'
      : error.message;
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  return NextResponse.json({ ok: true, sale: data });
}
