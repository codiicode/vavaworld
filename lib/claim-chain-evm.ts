'use client';

import { NATIVE_PAY, TILES_ABI, TILES_ADDRESS, h3ToUint64 } from './evm';
import { resilientFetch } from './resilient-fetch';

/**
 * EVM claim settlement. One quote from /api/quote authorizes exactly one
 * claim(...) transaction; a basket over CLAIM_CHUNK becomes N quotes and
 * N transactions. The contract splits each price 85/15 (treasury /
 * buyback escrow) and rejects anything without a valid keeper signature.
 */

export const CLAIM_CHUNK = Number(process.env.NEXT_PUBLIC_CLAIM_CHUNK ?? 400);

export type PayCurrency = 'eth' | 'usdg';

export type EvmClaimQuote = {
  h3s: string[];
  perHexUsd: number[];
  payToken: `0x${string}`;
  prices: string[];
  tiers: number[];
  countries: number[];
  /** Undiscounted curve prices - the ledger validates against these. */
  perHexUsdFull?: number[];
  totalWei: string;
  totalUsd: number;
  expiry: string;
  signature: `0x${string}`;
  keeper: `0x${string}`;
};

export async function fetchQuotes(
  h3s: string[],
  claimer: string,
  currency: PayCurrency = 'eth',
): Promise<EvmClaimQuote[]> {
  const r = await resilientFetch('/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ h3s, claimer, currency }),
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
  const isEth = quote.payToken === NATIVE_PAY;
  return {
    address: TILES_ADDRESS,
    abi: TILES_ABI,
    functionName: 'claim' as const,
    args: [
      quote.h3s.map(h3ToUint64),
      quote.prices.map(BigInt),
      quote.tiers,
      quote.countries,
      BigInt(quote.expiry),
      quote.payToken,
      quote.signature,
    ],
    // USDG claims move tokens via transferFrom - no native value attached.
    value: isEth ? BigInt(quote.totalWei) : 0n,
  };
}

/** approve() call for the USDG path - run once before the claim tx. */
export function buildUsdgApproveCall(quote: EvmClaimQuote) {
  return {
    address: quote.payToken,
    abi: [
      {
        type: 'function',
        name: 'approve',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'spender', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ],
        outputs: [{ type: 'bool' }],
      },
    ],
    functionName: 'approve' as const,
    args: [TILES_ADDRESS, BigInt(quote.totalWei)],
  };
}
