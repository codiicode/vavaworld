export const T1_START = 20_000_000n;        // 0.02 SOL
export const T2_START = 10_000_000n;        // 0.01
export const T3_START =  1_000_000n;        // 0.001
export const T1_INCREMENT = 500_000n;
export const T2_INCREMENT = 100_000n;
export const T3_INCREMENT =  10_000n;

export type Tier = 1 | 2 | 3;

export function quoteOne(tier: Tier, soldAtClaim: bigint): bigint {
  const [start, inc] =
    tier === 1 ? [T1_START, T1_INCREMENT] :
    tier === 2 ? [T2_START, T2_INCREMENT] :
                 [T3_START, T3_INCREMENT];
  return start + soldAtClaim * inc;
}

export function quoteBatch(
  items: Array<{ tier: Tier }>,
  counters: { 1: bigint; 2: bigint; 3: bigint },
): bigint {
  const local: { 1: bigint; 2: bigint; 3: bigint } = { 1: 0n, 2: 0n, 3: 0n };
  let total = 0n;
  for (const it of items) {
    const sold = counters[it.tier] + local[it.tier];
    total += quoteOne(it.tier, sold);
    local[it.tier] += 1n;
  }
  return total;
}
