import { getPublicClient } from './evm';

/**
 * ETH/USD for converting the USD price curve to wei. Chainlink first
 * (on-chain, day-one infra on Robinhood Chain), Coinbase spot as fallback,
 * env constant as the last resort. Server-side only.
 */

const FEED = (process.env.CHAINLINK_ETH_USD_FEED ?? '') as `0x${string}`;
const FALLBACK = Number(process.env.ETH_USD_FALLBACK ?? 4500);

const AGG_ABI = [
  {
    name: 'latestRoundData',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'roundId', type: 'uint80' },
      { name: 'answer', type: 'int256' },
      { name: 'startedAt', type: 'uint256' },
      { name: 'updatedAt', type: 'uint256' },
      { name: 'answeredInRound', type: 'uint80' },
    ],
  },
] as const;

let cached: { price: number; at: number } | null = null;

export async function getEthUsd(): Promise<number> {
  if (cached && Date.now() - cached.at < 60_000) return cached.price;

  if (FEED) {
    try {
      const [, answer] = (await getPublicClient().readContract({
        address: FEED,
        abi: AGG_ABI,
        functionName: 'latestRoundData',
      })) as readonly [bigint, bigint, bigint, bigint, bigint];
      const price = Number(answer) / 1e8; // Chainlink USD feeds use 8 decimals
      if (price > 0) {
        cached = { price, at: Date.now() };
        return price;
      }
    } catch {
      /* fall through */
    }
  }
  try {
    const r = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot', {
      cache: 'no-store',
    });
    const j = await r.json();
    const price = Number(j?.data?.amount);
    if (price > 0) {
      cached = { price, at: Date.now() };
      return price;
    }
  } catch {
    /* fall through */
  }
  return cached?.price ?? FALLBACK;
}
