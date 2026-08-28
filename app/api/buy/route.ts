import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getServerSupabase } from '@/lib/supabase-server';
import { getRpcUrl } from '@/lib/anchor-client';
import {
  SECONDARY_FEE_BPS,
  PRESIDENT_SECONDARY_BPS,
  TIERS,
  VAVA_UNIT,
} from '@/lib/tokenomics-constants';
import idl from '@/lib/anchor-idl.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PROGRAM_ID = new PublicKey((idl as { address: string }).address);
const TREASURY = process.env.NEXT_PUBLIC_TREASURY ?? '74fWA4NXGtv7RJEd9oTJk9vjqZCTMz2W1s5soCvC6b4X';
const LAMPORTS = 1_000_000_000;

type Quote = {
  listingId: string;
  h3Id: string;
  seller: string;
  priceSol: number;
  feeBps: number;
  transfers: Array<{ to: string; lamports: number; label: string }>;
  totalLamports: number;
};

/**
 * The seller's fee tier comes from their ON-CHAIN stake: barons
 * (>= 500k staked $VAVA) sell at 3%, everyone else at 5%. The
 * president's 1% is inside the fee and never discounted; it routes to
 * the treasury until thrones ship (block C swaps the recipient).
 */
async function sellerFeeBps(connection: Connection, seller: string): Promise<number> {
  try {
    const owner = new PublicKey(seller);
    const [stakePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('stake'), owner.toBuffer()],
      PROGRAM_ID,
    );
    const info = await connection.getAccountInfo(stakePda);
    if (!info) return SECONDARY_FEE_BPS.standard;
    // StakeAccount layout: 8 disc + 32 owner + 8 amount + ...
    const amount = info.data.readBigUInt64LE(40);
    const baronThreshold = BigInt(TIERS.find((t) => t.key === 'baron')!.threshold) * BigInt(VAVA_UNIT);
    return amount >= baronThreshold ? SECONDARY_FEE_BPS.baron : SECONDARY_FEE_BPS.standard;
  } catch {
    return SECONDARY_FEE_BPS.standard;
  }
}

async function buildQuote(listingId: string): Promise<Quote | { error: string; status: number }> {
  const sb = getServerSupabase();
  const { data: listing, error } = await sb
    .from('listings')
    .select('id,h3_id,seller,price_sol,status')
    .eq('id', listingId)
    .maybeSingle<{ id: string; h3_id: string; seller: string; price_sol: number; status: string }>();
  if (error) return { error: error.message, status: 500 };
  if (!listing || listing.status !== 'active') return { error: 'Listing is not active', status: 404 };

  const connection = new Connection(getRpcUrl(), 'confirmed');
  const feeBps = await sellerFeeBps(connection, listing.seller);
  const priceLamports = Math.round(Number(listing.price_sol) * LAMPORTS);

  const presidentLamports = Math.floor((priceLamports * PRESIDENT_SECONDARY_BPS) / 10_000);
  const protocolLamports = Math.floor((priceLamports * (feeBps - PRESIDENT_SECONDARY_BPS)) / 10_000);
  const sellerLamports = priceLamports - presidentLamports - protocolLamports;

  return {
    listingId: listing.id,
    h3Id: listing.h3_id,
    seller: listing.seller,
    priceSol: Number(listing.price_sol),
    feeBps,
    transfers: [
      { to: listing.seller, lamports: sellerLamports, label: 'seller' },
      { to: TREASURY, lamports: protocolLamports, label: 'protocol' },
      // President share -> treasury until thrones exist (block C).
      { to: TREASURY, lamports: presidentLamports, label: 'president' },
    ],
    totalLamports: priceLamports,
  };
}

/** GET /api/buy?listingId= → the exact transfers the buyer must make. */
export async function GET(req: Request) {
  const listingId = new URL(req.url).searchParams.get('listingId');
  if (!listingId) return NextResponse.json({ error: 'listingId required' }, { status: 400 });
  const quote = await buildQuote(listingId);
  if ('error' in quote) return NextResponse.json({ error: quote.error }, { status: quote.status });
  return NextResponse.json(quote);
}

/**
 * POST /api/buy { listingId, buyer, txSig } → verify the payment
 * transaction on-chain against an independently recomputed quote, then
 * settle atomically in the database. The client can never influence
 * amounts - only present a transaction that matches.
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

  const connection = new Connection(getRpcUrl(), 'confirmed');
  const tx = await connection.getTransaction(txSig, {
    commitment: 'confirmed',
    maxSupportedTransactionVersion: 0,
  });
  if (!tx || tx.meta?.err) {
    return NextResponse.json({ error: 'Transaction not found or failed' }, { status: 400 });
  }

  // Buyer must have signed and paid.
  const keys = tx.transaction.message.getAccountKeys().staticAccountKeys.map((k) => k.toBase58());
  if (keys[0] !== buyer) {
    return NextResponse.json({ error: 'Transaction not signed by buyer' }, { status: 400 });
  }

  // Verify every leg by balance delta (index-robust, immune to how the
  // client composed the transfers).
  const pre = tx.meta!.preBalances;
  const post = tx.meta!.postBalances;
  const deltas = new Map<string, number>();
  keys.forEach((k, i) => deltas.set(k, (deltas.get(k) ?? 0) + (post[i] - pre[i])));

  const expected = new Map<string, number>();
  for (const t of quote.transfers) {
    expected.set(t.to, (expected.get(t.to) ?? 0) + t.lamports);
  }
  for (const [to, lamports] of expected) {
    if ((deltas.get(to) ?? 0) < lamports) {
      return NextResponse.json(
        { error: `Underpaid recipient ${to.slice(0, 6)}…` },
        { status: 400 },
      );
    }
  }

  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('settle_sale', {
    p_listing_id: listingId,
    p_buyer: buyer,
    p_tx_hash: txSig,
    p_fee_bps: quote.feeBps,
  });
  if (error) {
    const msg = error.message.includes('duplicate key')
      ? 'This transaction was already used'
      : error.message;
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  return NextResponse.json({ ok: true, sale: data });
}
