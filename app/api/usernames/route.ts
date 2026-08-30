import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const revalidate = 30;

/**
 * POST /api/usernames { addresses: string[] } → { [address]: username }
 * Only addresses with a set username appear in the map. Batched so the
 * whole activity feed / leaderboard resolves in one round trip.
 */
export async function POST(req: Request) {
  let body: { addresses?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const addresses = Array.isArray(body.addresses)
    ? body.addresses.filter((a): a is string => typeof a === 'string').slice(0, 200)
    : [];
  if (addresses.length === 0) return NextResponse.json({ usernames: {} });

  const sb = getServerSupabase();
  const { data, error } = await sb
    .from('profiles')
    .select('wallet_address,username,x_handle')
    .in('wallet_address', addresses);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const usernames: Record<string, string> = {};
  const x: Record<string, string> = {};
  for (const row of (data ?? []) as Array<{
    wallet_address: string;
    username: string | null;
    x_handle: string | null;
  }>) {
    if (row.username) usernames[row.wallet_address] = row.username;
    if (row.x_handle) x[row.wallet_address] = row.x_handle;
  }
  return NextResponse.json({ usernames, x });
}
