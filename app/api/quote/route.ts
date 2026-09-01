import { NextResponse } from 'next/server';
import { isValidCell, getResolution } from 'h3-js';
import { privateKeyToAccount } from 'viem/accounts';
import { getServerSupabase } from '@/lib/supabase-server';
import { resolveHexCountry } from '@/lib/geo/country-resolver';
import { H3_RESOLUTION, PRICING } from '@/lib/pricing';
import { getEthUsd } from '@/lib/eth-price';
import { hexCenter } from '@/lib/h3-utils';
import { classifyTier } from '@/lib/tier';
import { CLAIM_DOMAIN, CLAIM_TYPES, TILES_ADDRESS, h3ToUint64 } from '@/lib/evm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/quote  { h3s: string[], claimer: 0x... }
 *
 * Prices a claim basket on the per-country USD curve and signs it with the
 * keeper key as an EIP-712 VavaClaim. The contract refuses claims without
 * a valid keeper signature, so this endpoint is the ONLY way land can be
 * priced - nobody can settle hexes at a made-up price or tier.
 *
 * One signed quote per CLAIM_CHUNK hexes = one claim transaction. On EVM a
 * whole 400-hex chunk settles in a single transaction.
 */
const CLAIM_CHUNK = Number(process.env.NEXT_PUBLIC_CLAIM_CHUNK ?? 400);
const MAX_PER_REQUEST = 1000;
const QUOTE_TTL_SECS = 180;

function keeperAccount() {
  const raw = process.env.KEEPER_EVM_KEY;
  if (!raw) return null;
  try {
    return privateKeyToAccount(raw.trim() as `0x${string}`);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: { h3s?: unknown; claimer?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const h3s = Array.isArray(body.h3s)
    ? body.h3s.filter((x): x is string => typeof x === 'string')
    : [];
  const claimer = typeof body.claimer === 'string' ? body.claimer.trim() : '';
  if (h3s.length === 0 || h3s.length > MAX_PER_REQUEST) {
    return NextResponse.json({ error: `h3s must contain 1-${MAX_PER_REQUEST} hexes` }, { status: 400 });
  }
  if (new Set(h3s).size !== h3s.length) {
    return NextResponse.json({ error: 'duplicate hexes in basket' }, { status: 400 });
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(claimer)) {
    return NextResponse.json({ error: 'invalid claimer address' }, { status: 400 });
  }
  for (const h3 of h3s) {
    if (!isValidCell(h3) || getResolution(h3) !== H3_RESOLUTION) {
      return NextResponse.json({ error: `invalid res-${H3_RESOLUTION} hex: ${h3}` }, { status: 400 });
    }
  }
  const signer = keeperAccount();
  if (!signer) {
    return NextResponse.json({ error: 'quote signing not configured' }, { status: 503 });
  }
  const chainId = Number(process.env.NEXT_PUBLIC_EVM_CHAIN_ID ?? 0);
  if (!chainId || !TILES_ADDRESS) {
    return NextResponse.json({ error: 'contract not configured' }, { status: 503 });
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

  const ethUsd = await getEthUsd();
  const localOffset = new Map<string, number>();
  const perHexUsd: number[] = [];
  const pricesWei: bigint[] = [];
  const tiers: number[] = [];
  h3s.forEach((h3, i) => {
    const iso = isos[i];
    const base = countByIso.get(iso) ?? 0;
    const off = localOffset.get(iso) ?? 0;
    localOffset.set(iso, off + 1);
    const usd = PRICING.BASE_FLOOR_USD + (base + off) * PRICING.SLOPE_PER_CLAIM_USD;
    perHexUsd.push(usd);
    // usd -> wei via micro-eth precision: round(usd/ethUsd * 1e12) * 1e6
    pricesWei.push(BigInt(Math.round((usd / ethUsd) * 1e12)) * 10n ** 6n);
    const c = hexCenter(h3);
    tiers.push(classifyTier(c.lat, c.lng));
  });

  const expiry = BigInt(Math.floor(Date.now() / 1000) + QUOTE_TTL_SECS);

  const quotes = [];
  for (let i = 0; i < h3s.length; i += CLAIM_CHUNK) {
    const cH3s = h3s.slice(i, i + CLAIM_CHUNK);
    const cWei = pricesWei.slice(i, i + CLAIM_CHUNK);
    const cTiers = tiers.slice(i, i + CLAIM_CHUNK);
    const cUsd = perHexUsd.slice(i, i + CLAIM_CHUNK);

    const signature = await signer.signTypedData({
      domain: CLAIM_DOMAIN(chainId, TILES_ADDRESS),
      types: CLAIM_TYPES,
      primaryType: 'VavaClaim',
      message: {
        claimer: claimer as `0x${string}`,
        h3s: cH3s.map(h3ToUint64),
        pricesWei: cWei,
        tiers: cTiers,
        expiry,
      },
    });

    quotes.push({
      h3s: cH3s,
      perHexUsd: cUsd,
      pricesWei: cWei.map(String),
      tiers: cTiers,
      totalWei: cWei.reduce((s, p) => s + p, 0n).toString(),
      totalUsd: cUsd.reduce((s, u) => s + u, 0),
      expiry: expiry.toString(),
      signature,
      keeper: signer.address,
    });
  }

  return NextResponse.json({
    quotes,
    totalWei: pricesWei.reduce((s, p) => s + p, 0n).toString(),
    totalUsd: perHexUsd.reduce((s, u) => s + u, 0),
    ethUsd,
    expiry: expiry.toString(),
  });
}
