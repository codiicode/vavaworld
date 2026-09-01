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
