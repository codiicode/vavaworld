/**
 * SOL/USD for pricing the Solana payment rail. Coinbase spot, 60s cache,
 * env fallback. Server-side only. (lib/sol-price.ts is the ETH rate
 * under a legacy name - do not confuse the two.)
 */
const FALLBACK = Number(process.env.SOL_USD_FALLBACK ?? 150);
let cached: { price: number; at: number } | null = null;

export async function getSolUsdRate(): Promise<number> {
  if (cached && Date.now() - cached.at < 60_000) return cached.price;
  try {
    const r = await fetch('https://api.coinbase.com/v2/prices/SOL-USD/spot', { cache: 'no-store' });
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
