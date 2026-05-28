import { gridDisk } from 'h3-js';

/**
 * Returns up to `total` H3 cells centred on `seed`, expanding ring by ring
 * until the count is reached. Used by the "Mark the N closest" quick-picks
 * on /map so a user can grab a 10/100/500/1000-hex cluster in one tap.
 *
 * gridDisk(seed, k) yields all cells within k rings of the seed (including
 * the seed itself). Cell counts per radius: k=1 → 7, k=2 → 19, k=3 → 37,
 * k=4 → 61, k=5 → 91, k=6 → 127, … k(n) = 3n(n+1) + 1.
 *
 * The result always starts with the seed and is then trimmed to exactly
 * `total` cells, so a request of 10 returns the seed + 9 nearest neighbours.
 */
export function expandFromSeed(seed: string, total: number): string[] {
  if (total <= 1) return [seed];
  let k = 1;
  let cells = gridDisk(seed, k);
  // Guard against runaway expansion if total is unreasonable. k=30 already
  // yields 2 791 cells, well past the on-chain claim ceiling.
  while (cells.length < total && k < 30) {
    k++;
    cells = gridDisk(seed, k);
  }
  // gridDisk doesn't guarantee seed-first ordering on every release - make
  // sure it is, then trim.
  if (cells[0] !== seed) {
    cells = [seed, ...cells.filter((c) => c !== seed)];
  }
  return cells.slice(0, total);
}
