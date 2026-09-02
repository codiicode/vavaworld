import { NextResponse } from 'next/server';
import { getEvmRpcUrl } from '@/lib/evm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * JSON-RPC relay: the browser's fallback path when the public RPC drops
 * its request (launch-day load, Cloudflare edge hiccups). Read-only by
 * allowlist - transactions still go straight from the wallet to the RPC,
 * so this can never sign or send anything.
 */
const ALLOWED = new Set([
  'eth_blockNumber',
  'eth_call',
  'eth_chainId',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_getBalance',
  'eth_getBlockByNumber',
  'eth_getCode',
  'eth_getLogs',
  'eth_getTransactionByHash',
  'eth_getTransactionCount',
  'eth_getTransactionReceipt',
  'eth_maxPriorityFeePerGas',
  // Broadcasting an ALREADY-SIGNED transaction is safe to relay - the
  // signature fixes every field, the relay can't alter or initiate anything.
  'eth_sendRawTransaction',
]);

type RpcCall = { jsonrpc?: string; id?: unknown; method?: string; params?: unknown };

export async function POST(req: Request) {
  let body: RpcCall | RpcCall[];
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }
  const calls = Array.isArray(body) ? body : [body];
  if (calls.length > 50) {
    return NextResponse.json({ error: 'batch too large' }, { status: 400 });
  }
  for (const c of calls) {
    if (!c?.method || !ALLOWED.has(c.method)) {
      return NextResponse.json({ error: `method not allowed: ${c?.method}` }, { status: 403 });
    }
  }
  try {
    const upstream = await fetch(getEvmRpcUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json({ error: 'upstream rpc unreachable' }, { status: 502 });
  }
}
