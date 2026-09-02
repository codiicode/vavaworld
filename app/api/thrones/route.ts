import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { getStakedWhole, verifySignedAction } from '@/lib/server-verify';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/thrones[?country=SE] → thrones + active coups (+ earnings
 * for a single country). Also lazily resolves any expired coup windows
 * (pg_cron does it every minute too - belt and suspenders).
 */
export async function GET(req: Request) {
  const sb = getServerSupabase();
  await sb.rpc('resolve_coups');

  const iso = new URL(req.url).searchParams.get('country')?.toUpperCase() ?? null;

  const [{ data: thrones, error: e1 }, { data: coups, error: e2 }] = await Promise.all([
    iso
      ? sb.from('thrones').select('*').eq('country_iso', iso)
      : sb.from('thrones').select('*'),
    iso
      ? sb.from('coups').select('*').eq('country_iso', iso).order('started_at', { ascending: false }).limit(10)
      : sb.from('coups').select('*').eq('status', 'active'),
  ]);
  const err = e1 ?? e2;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  let earnings: { primaryUsd: number; secondarySol: number } | null = null;
  let landFloor: number | null = null;
  if (iso) {
    const [{ data: earn }, { data: floor }] = await Promise.all([
      sb.rpc('throne_earnings', { p_iso: iso }),
      sb.rpc('throne_land_floor', { p_iso: iso }),
    ]);
    const e = (earn as Array<{ primary_usd: number; secondary_sol: number }> | null)?.[0];
    earnings = {
      primaryUsd: Number(e?.primary_usd ?? 0),
      secondarySol: Number(e?.secondary_sol ?? 0),
    };
    landFloor = Number(floor ?? 250);
  }

  return NextResponse.json({ thrones: thrones ?? [], coups: coups ?? [], earnings, landFloor });
}

/**
 * POST /api/thrones - claim a vacant throne or attempt a coup.
 * Body: { action: 'claim'|'coup', countryIso, address, message, signature }
 * Message format: "vava:throne:<action>:<ISO>:<address>:ts=<unix-ms>"
 *
 * Land rules are enforced atomically in SQL (claim_throne /
 * attempt_coup). The 1M $VAVA stake is verified here against the
 * on-chain stake account.
 */
export async function POST(req: Request) {
  let body: {
    action?: string;
    countryIso?: string;
    address?: string;
    message?: string;
    signature?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { action, countryIso, address, message, signature } = body;
  if (!action || !countryIso || !address || !message || !signature) {
    return NextResponse.json({ error: 'action, countryIso, address, message, signature required' }, { status: 400 });
  }
  if (action !== 'claim' && action !== 'coup') {
    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }
  const iso = countryIso.toUpperCase();

  const sig = await verifySignedAction({
    address,
    message,
    signatureB58: signature,
    expectPrefix: `vava:throne:${action}:${iso}:${address}:`,
  });
  if (!sig.ok) return NextResponse.json({ error: sig.error }, { status: 401 });

  // Multiple thrones are allowed - but each one demands its OWN million.
  // Throne #2 needs 2M staked in total, #3 needs 3M, and so on; the same
  // bar applies to coups. Land is always per country (1000+ hexes there).
  const sb = getServerSupabase();
  const { count: held } = await sb
    .from('thrones')
    .select('*', { count: 'exact', head: true })
    .eq('holder', address);
  const requiredStake = ((held ?? 0) + 1) * 1_000_000;
  const staked = await getStakedWhole(address);
  if (staked < requiredStake) {
    return NextResponse.json(
      {
        error: `Throne #${(held ?? 0) + 1} requires ${requiredStake.toLocaleString('en-US')} $VAVA staked - you have ${Math.floor(staked).toLocaleString('en-US')}`,
      },
      { status: 403 },
    );
  }

  const { data, error } =
    action === 'claim'
      ? await sb.rpc('claim_throne', { p_iso: iso, p_holder: address, p_secret: API_SECRET })
      : await sb.rpc('attempt_coup', { p_iso: iso, p_challenger: address, p_secret: API_SECRET });

  if (error) {
    return NextResponse.json({ error: error.message.replace(/^.*?: /, '') }, { status: 409 });
  }
  return NextResponse.json({ ok: true, result: data });
}
