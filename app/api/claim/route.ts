import { NextResponse } from 'next/server';
import { isValidCell, getResolution } from 'h3-js';
import { getServerSupabase } from '@/lib/supabase-server';
import { resolveHexCountry } from '@/lib/geo/country-resolver';
import { H3_RESOLUTION } from '@/lib/pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/claim  { h3, owner }
 *
 * Resolves the hex → country, then calls the atomic `claim_hex` DB function:
 * it locks the country row, prices the claim at the floor that existed
 * BEFORE this claim is counted, inserts the hex, and increments the count —
 * all in one transaction, so concurrent claims serialise correctly.
 */
export async function POST(req: Request) {
  let body: { h3?: unknown; owner?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }

  const h3 = typeof body.h3 === 'string' ? body.h3.trim() : '';
  const owner = typeof body.owner === 'string' ? body.owner.trim() : '';

  if (!h3 || !isValidCell(h3)) {
    return NextResponse.json({ error: 'invalid h3 id' }, { status: 400 });
  }
  if (getResolution(h3) !== H3_RESOLUTION) {
    return NextResponse.json(
      { error: `hex must be H3 resolution ${H3_RESOLUTION}` },
      { status: 400 },
    );
  }
  if (!owner) {
    return NextResponse.json({ error: 'owner required' }, { status: 400 });
  }

  const countryIso = resolveHexCountry(h3);

  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('claim_hex', {
    p_h3: h3,
    p_country_iso: countryIso,
    p_owner: owner,
  });

  if (error) {
    // unique_violation (23505) → hex already claimed.
    const already =
      error.code === '23505' || /already claimed/i.test(error.message ?? '');
    return NextResponse.json(
      { error: already ? 'hex already claimed' : error.message },
      { status: already ? 409 : 500 },
    );
  }

  return NextResponse.json({ ok: true, ...data }, { headers: { 'Cache-Control': 'no-store' } });
}
