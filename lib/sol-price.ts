import { SOL_USD } from './pricing';

/**
 * Live SOL/USD, cached 60s per server instance. Primary source is
 * Jupiter's price API (free, Solana-native); Pyth Hermes now requires
 * an API key so it's not used. Falls back to the last good price, then
 * the hardcoded reference rate - client quotes and server verification
 * use the same endpoint, so the system degrades consistently.
 */
const WSOL = 'So11111111111111111111111111111111111111112';
const JUP_URL = `https://lite-api.jup.ag/price/v3?ids=${WSOL}`;

let cached: { price: number; at: number } | null = null;

export async function getSolUsd(): Promise<number> {
  if (cached && Date.now() - cached.at < 60_000) return cached.price;
  try {
    const res = await fetch(JUP_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as Record<string, { usdPrice?: number }>;
    const price = json[WSOL]?.usdPrice;
    if (!price || !Number.isFinite(price) || price <= 0) throw new Error('bad price');
    cached = { price, at: Date.now() };
    return price;
  } catch {
    return cached?.price ?? SOL_USD;
  }
}
