import { describe, expect, it } from 'vitest';
import { proRata } from '../../scripts/keeper-math.mjs';

const p = (v: bigint) => v;

describe('evm keeper proRata', () => {
  it('sums exactly and splits proportionally', () => {
    expect(proRata(1_000_000n, [100n, 200n, 700n].map(p))).toEqual([100_000n, 200_000n, 700_000n]);
  });
  it('largest remainder loses nothing on adversarial ratios', () => {
    const shares = proRata(999_999_999_999n, [3n, 7n, 11n, 13n, 1n]);
    expect(shares.reduce((s: bigint, x: bigint) => s + x, 0n)).toBe(999_999_999_999n);
  });
  it('zero cases', () => {
    expect(proRata(0n, [5n])).toEqual([0n]);
    expect(proRata(10n, [0n, 0n])).toEqual([0n, 0n]);
  });
});
