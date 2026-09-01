/**
 * Mainnet swap leg for the buyback keeper: SOL -> $VAVA via Jupiter's
 * Order/Execute API (Swap V2). One swap per pass for the total pending
 * amount, then the output is distributed pro-rata across tiles.
 *
 * Keyless access to api.jup.ag is rate-limited to 0.5 RPS - fine for a
 * keeper that runs once a minute. Set JUPITER_API_KEY for headroom.
 */
import { VersionedTransaction } from '@solana/web3.js';

export const WSOL_MINT = 'So11111111111111111111111111111111111111112';

/**
 * Split `totalOut` (base units of swap output) across tiles proportionally
 * to their pending lamports. Largest-remainder rounding so the shares sum
 * to exactly totalOut and no tile rounds down to 0 while others overshoot.
 *
 * tiles: [{ pending: bigint }, ...] -> bigint[] (same order).
 */
export function proRata(totalOut, tiles) {
  const total = tiles.reduce((s, t) => s + t.pending, 0n);
  if (total === 0n || totalOut === 0n) return tiles.map(() => 0n);

  const shares = tiles.map((t) => (totalOut * t.pending) / total);
  let remainder = totalOut - shares.reduce((s, x) => s + x, 0n);

  // Hand the leftover units to the largest fractional remainders first.
  const order = tiles
    .map((t, i) => ({ i, frac: (totalOut * t.pending) % total }))
    .sort((a, b) => (b.frac > a.frac ? 1 : b.frac < a.frac ? -1 : 0));
  for (const { i } of order) {
    if (remainder === 0n) break;
    shares[i] += 1n;
    remainder -= 1n;
  }
  return shares;
}

export function buildOrderUrl(baseUrl, { inputMint, outputMint, amount, taker }) {
  const qs = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    taker,
  });
  return `${baseUrl.replace(/\/$/, '')}/order?${qs}`;
}

/**
 * Swap `amountLamports` of SOL into `outputMint` owned by `signer`.
 * Returns { outAmount: bigint, signature: string }.
 *
 * `fetchImpl` is injectable for tests; defaults to global fetch.
 */
export async function jupiterSwap(
  { baseUrl, apiKey, signer, outputMint, amountLamports },
  fetchImpl = fetch,
) {
  const headers = { 'content-type': 'application/json' };
  if (apiKey) headers['x-api-key'] = apiKey;

  const orderUrl = buildOrderUrl(baseUrl, {
    inputMint: WSOL_MINT,
    outputMint,
    amount: amountLamports,
    taker: signer.publicKey.toBase58(),
  });
  const orderRes = await fetchImpl(orderUrl, { headers });
  if (!orderRes.ok) {
    throw new Error(`jupiter /order HTTP ${orderRes.status}: ${(await orderRes.text()).slice(0, 200)}`);
  }
  const order = await orderRes.json();
  if (!order.transaction) {
    throw new Error(
      `jupiter /order returned no transaction (code=${order.errorCode ?? '?'}): ${order.errorMessage ?? 'unknown'}`,
    );
  }

  const tx = VersionedTransaction.deserialize(Buffer.from(order.transaction, 'base64'));
  tx.sign([signer]);
  const signedTransaction = Buffer.from(tx.serialize()).toString('base64');

  const execRes = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/execute`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ signedTransaction, requestId: order.requestId }),
  });
  if (!execRes.ok) {
    throw new Error(`jupiter /execute HTTP ${execRes.status}: ${(await execRes.text()).slice(0, 200)}`);
  }
  const exec = await execRes.json();
  if (exec.status !== 'Success') {
    throw new Error(`jupiter swap failed (code=${exec.code}): ${exec.error ?? exec.signature ?? ''}`);
  }
  return { outAmount: BigInt(exec.totalOutputAmount ?? order.outAmount), signature: exec.signature };
}
