'use client';

import { TILES_ABI, TILES_ADDRESS, h3ToUint64 } from './evm';

/**
 * EVM claim settlement. One quote from /api/quote authorizes exactly one
 * claim(...) transaction; a basket over CLAIM_CHUNK becomes N quotes and
 * N transactions. The contract splits each price 85/15 (treasury /
 * buyback escrow) and rejects anything without a valid keeper signature.
 */

export const CLAIM_CHUNK = Number(process.env.NEXT_PUBLIC_CLAIM_CHUNK ?? 400);

export type EvmClaimQuote = {
  h3s: string[];
  perHexUsd: number[];
  pricesWei: string[];
  tiers: number[];
  totalWei: string;
  totalUsd: number;
  expiry: string;
  signature: `0x${string}`;
  keeper: `0x${string}`;
};

export async function fetchQuotes(h3s: string[], claimer: string): Promise<EvmClaimQuote[]> {
  const r = await fetch('/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ h3s, claimer }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? 'quote failed');
  return j.quotes as EvmClaimQuote[];
}

/**
 * writeContract args for one quoted chunk. The caller supplies these to
 * the wallet layer (Privy sendTransaction / wagmi writeContract).
 */
export function buildClaimCall(quote: EvmClaimQuote) {
  return {
    address: TILES_ADDRESS,
    abi: TILES_ABI,
    functionName: 'claim' as const,
    args: [
      quote.h3s.map(h3ToUint64),
      quote.pricesWei.map(BigInt),
      quote.tiers,
      BigInt(quote.expiry),
      quote.signature,
    ],
    value: BigInt(quote.totalWei),
  };
}
