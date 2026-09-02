/** Largest-remainder pro-rata: shares sum to exactly totalOut. Pure -
 *  shared by the keeper service and its unit tests. */
export function proRata(totalOut, pendings) {
  const total = pendings.reduce((s, p) => s + p, 0n);
  if (total === 0n || totalOut === 0n) return pendings.map(() => 0n);
  const shares = pendings.map((p) => (totalOut * p) / total);
  let rem = totalOut - shares.reduce((s, x) => s + x, 0n);
  const order = pendings
    .map((p, i) => ({ i, frac: (totalOut * p) % total }))
    .sort((a, b) => (b.frac > a.frac ? 1 : b.frac < a.frac ? -1 : 0));
  for (const { i } of order) {
    if (rem === 0n) break;
    shares[i] += 1n;
    rem -= 1n;
  }
  return shares;
}

/**
 * Uniswap v3 multi-hop path: token(20B) + fee(3B) + token(20B) + ...
 * encodePath(['0xA..','0xB..','0xC..'], [500, 3000]) -> '0x...' for
 * A -(500)-> B -(3000)-> C. Pure - unit-tested.
 */
export function encodePath(tokens, fees) {
  if (tokens.length !== fees.length + 1) throw new Error('path: need N tokens and N-1 fees');
  let out = '0x';
  for (let i = 0; i < fees.length; i++) {
    out += tokens[i].slice(2).toLowerCase();
    out += fees[i].toString(16).padStart(6, '0');
  }
  out += tokens[tokens.length - 1].slice(2).toLowerCase();
  return out;
}
