import { describe, it, expect } from 'vitest';
import { quoteOne, quoteBatch, T1_START, T2_START, T3_START } from '../quote';

describe('quoteOne', () => {
  it('tier 1 with 0 sold = T1_START', () => {
    expect(quoteOne(1, 0n)).toBe(T1_START);
  });
  it('tier 1 after 100 sold', () => {
    expect(quoteOne(1, 100n)).toBe(T1_START + 100n * 500_000n);
  });
  it('tier 2 after 1000 sold', () => {
    expect(quoteOne(2, 1000n)).toBe(T2_START + 1000n * 100_000n);
  });
  it('tier 3 with 0 sold', () => {
    expect(quoteOne(3, 0n)).toBe(T3_START);
  });
});

describe('quoteBatch', () => {
  it('three same-tier tiles use escalating prices', () => {
    const total = quoteBatch(
      [{ tier: 1 }, { tier: 1 }, { tier: 1 }],
      { 1: 0n, 2: 0n, 3: 0n },
    );
    expect(total).toBe(T1_START + (T1_START + 500_000n) + (T1_START + 1_000_000n));
  });

  it('mixed tiers use independent counters', () => {
    const total = quoteBatch(
      [{ tier: 1 }, { tier: 2 }, { tier: 1 }],
      { 1: 5n, 2: 10n, 3: 0n },
    );
    expect(total).toBe(
      (T1_START + 5n * 500_000n) +
      (T2_START + 10n * 100_000n) +
      (T1_START + 6n * 500_000n),
    );
  });
});
