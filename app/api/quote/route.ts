import { NextResponse } from 'next/server';
import { isValidCell, getResolution } from 'h3-js';
import { Keypair, PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { getServerSupabase } from '@/lib/supabase-server';
import { resolveHexCountry } from '@/lib/geo/country-resolver';
import { H3_RESOLUTION, PRICING } from '@/lib/pricing';
import { getSolUsd } from '@/lib/sol-price';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Must match the program's QUOTE_DOMAIN + hash layout exactly. */
const QUOTE_DOMAIN = 'VAVA_CLAIM_V1';
/** One quote authorizes ONE claim transaction (<= this many hexes). */
const MAX_PER_QUOTE = 10;
const QUOTE_TTL_SECS = 120;

function keeper(): Keypair | null {
  const raw = process.env.KEEPER_SECRET_KEY;
  if (!raw) return null;
  try {
    return Keypair.fromSecretKey(bs58.decode(raw.trim()));
  } catch {
    return null;
  }
}

/**
 * POST /api/quote  { h3s: string[], claimer: string }
 *
 * Prices a claim batch on the per-country USD curve and signs it with the
 * keeper key. The on-chain program refuses claims without a valid keeper
 * signature, so this endpoint is the ONLY way land can be priced - nobody
 * can settle hexes by calling the program directly at a made-up price.
 */
export async function POST(req: Request) {
  let body: { h3s?: unknown; claimer?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const h3s = Array.isArray(body.h3s) ? body.h3s.filter((x): x is string => typeof x === 'string') : [];
  const claimer = typeof body.claimer === 'string' ? body.claimer.trim() : '';
  if (h3s.length === 0 || h3s.length > MAX_PER_QUOTE) {
    return NextResponse.json({ error: `h3s must contain 1-${MAX_PER_QUOTE} hexes` }, { status: 400 });
  }
  if (new Set(h3s).size !== h3s.length) {
    return NextResponse.json({ error: 'duplicate hexes in batch' }, { status: 400 });
  }
  let claimerPk: PublicKey;
  try {
    claimerPk = new PublicKey(claimer);
  } catch {
    return NextResponse.json({ error: 'invalid claimer address' }, { status: 400 });
  }
  for (const h3 of h3s) {
    if (!isValidCell(h3) || getResolution(h3) !== H3_RESOLUTION) {
      return NextResponse.json({ error: `invalid res-${H3_RESOLUTION} hex: ${h3}` }, { status: 400 });
    }
  }
  const signer = keeper();
  if (!signer) {
    return NextResponse.json({ error: 'quote signing not configured' }, { status: 503 });
  }

  // Availability + per-country floor walk, matching the claim ledger.
  const sb = getServerSupabase();
  const { data: taken } = await sb.from('hexes').select('h3_id').in('h3_id', h3s);
  if ((taken ?? []).length > 0) {
    return NextResponse.json(
      { error: 'already claimed', h3s: (taken ?? []).map((t) => t.h3_id) },
      { status: 409 },
    );
  }

  const isos = h3s.map((h3) => resolveHexCountry(h3));
  const uniqueIsos = Array.from(new Set(isos));
  const { data: countries } = await sb
    .from('countries')
    .select('iso_code, claim_count')
    .in('iso_code', uniqueIsos);
  const countByIso = new Map((countries ?? []).map((c) => [c.iso_code, Number(c.claim_count)]));

  const solUsd = await getSolUsd();
  const localOffset = new Map<string, number>();
  const perHexUsd: number[] = [];
  const pricesLamports: bigint[] = [];
  h3s.forEach((_, i) => {
    const iso = isos[i];
    const base = countByIso.get(iso) ?? 0;
    const off = localOffset.get(iso) ?? 0;
    localOffset.set(iso, off + 1);
    const usd = PRICING.BASE_FLOOR_USD + (base + off) * PRICING.SLOPE_PER_CLAIM_USD;
    perHexUsd.push(usd);
    pricesLamports.push(BigInt(Math.round((usd / solUsd) * 1_000_000_000)));
  });

  const expiry = BigInt(Math.floor(Date.now() / 1000) + QUOTE_TTL_SECS);

  // sha256(domain ++ claimer ++ expiry_le ++ [h3_le ++ price_le]*)
  const msg = Buffer.alloc(QUOTE_DOMAIN.length + 32 + 8 + h3s.length * 16);
  let o = 0;
  msg.write(QUOTE_DOMAIN, o); o += QUOTE_DOMAIN.length;
  claimerPk.toBuffer().copy(msg, o); o += 32;
  msg.writeBigInt64LE(expiry, o); o += 8;
  h3s.forEach((h3, i) => {
    msg.writeBigUInt64LE(BigInt('0x' + h3), o); o += 8;
    msg.writeBigUInt64LE(pricesLamports[i], o); o += 8;
  });
  const { createHash } = await import('node:crypto');
  const hash = createHash('sha256').update(msg).digest();
  const signature = nacl.sign.detached(hash, signer.secretKey);

  return NextResponse.json({
    h3s,
    perHexUsd,
    pricesLamports: pricesLamports.map(String),
    totalLamports: pricesLamports.reduce((s, p) => s + p, 0n).toString(),
    totalUsd: perHexUsd.reduce((s, u) => s + u, 0),
    solUsd,
    expiry: expiry.toString(),
    messageHash: bs58.encode(hash),
    signature: bs58.encode(signature),
    keeper: signer.publicKey.toBase58(),
  });
}
