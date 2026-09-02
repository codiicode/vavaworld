import { NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { getServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_SECRET = process.env.INDEXER_API_SECRET ?? '';
const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '';
const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET ?? '';

/**
 * POST /api/verify-x { authToken, address }
 * Server-side X (Twitter) verification. Never trusts the client:
 *  1. authToken is verified against Privy (proves who the caller is)
 *  2. the user's linked accounts are fetched from Privy's API
 *  3. `address` must be one of that user's own Solana wallets
 *  4. the linked X handle (or null if unlinked) is mirrored to the
 *     profile through a secret-gated RPC - the columns are not
 *     client-writable, so this path is the only way to get the badge.
 */
export async function POST(req: Request) {
  if (!PRIVY_APP_SECRET) {
    return NextResponse.json(
      { error: 'X verification not configured (PRIVY_APP_SECRET missing)' },
      { status: 501 },
    );
  }
  let body: { authToken?: string; address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const { authToken, address } = body;
  if (!authToken || !address) {
    return NextResponse.json({ error: 'authToken, address required' }, { status: 400 });
  }

  const privy = new PrivyClient(PRIVY_APP_ID, PRIVY_APP_SECRET);

  let userId: string;
  try {
    const claims = await privy.verifyAuthToken(authToken);
    userId = claims.userId;
  } catch {
    return NextResponse.json({ error: 'Invalid Privy session' }, { status: 401 });
  }

  const user = await privy.getUser(userId);
  const accounts = user.linkedAccounts ?? [];

  // The wallet being badged must belong to this Privy user.
  const ownsWallet = accounts.some(
    (a) =>
      a.type === 'wallet' &&
      (a as { chainType?: string }).chainType === 'ethereum' &&
      (a as { address?: string }).address?.toLowerCase() === address.toLowerCase(),
  );
  if (!ownsWallet) {
    return NextResponse.json({ error: 'Wallet does not belong to this account' }, { status: 403 });
  }

  const twitter = accounts.find((a) => a.type === 'twitter_oauth') as
    | { username?: string | null; subject?: string }
    | undefined;

  const sb = getServerSupabase();
  const { data, error } = await sb.rpc('set_x_verification', {
    p_address: address,
    p_handle: twitter?.username ?? null,
    p_subject: twitter?.subject ?? null,
    p_secret: API_SECRET,
  });
  if (error) {
    return NextResponse.json({ error: error.message.replace(/^.*?: /, '') }, { status: 409 });
  }
  return NextResponse.json({
    ok: true,
    xHandle: (data as { x_handle?: string | null } | null)?.x_handle ?? null,
  });
}
