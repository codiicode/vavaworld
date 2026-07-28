import { describe, expect, test } from 'vitest';
import { PRICING, calculateFloor, formatFloor, isQuoteFresh } from '../pricing';

describe('calculateFloor', () => {
  test.each([
    [0, 0.1],
    [1, 0.10001],
    [100, 0.101],
    [10_000, 0.2],
    [100_000, 1.1],
    [1_000_000, 10.1],
  ])('claimCount=%i → $%s', (count, expected) => {
    expect(calculateFloor(count)).toBeCloseTo(expected, 5);
  });

  test('zero claims returns exactly BASE_FLOOR_USD', () => {
    expect(calculateFloor(0)).toBe(PRICING.BASE_FLOOR_USD);
  });

  test('strictly monotonic - every additional claim raises the raw floor', () => {
    for (let n = 0; n < 1000; n += 50) {
      expect(calculateFloor(n + 1)).toBeGreaterThan(calculateFloor(n));
    }
  });
});

describe('formatFloor', () => {
  test('always renders 4 decimal places', () => {
    expect(formatFloor(0.1)).toBe('0.1000');
    expect(formatFloor(1.10001)).toBe('1.1000');
    expect(formatFloor(10.1234)).toBe('10.1234');
  });
});

describe('isQuoteFresh - slippage tolerance', () => {
  test('quote at current floor passes', () => {
    expect(isQuoteFresh(1.0, 1.0)).toBe(true);
  });

  test('quote above current floor passes', () => {
    expect(isQuoteFresh(1.5, 1.0)).toBe(true);
  });

  test('quote 2% below current floor passes (boundary)', () => {
    expect(isQuoteFresh(0.98, 1.0)).toBe(true);
  });

  test('quote >2% below current floor fails', () => {
    expect(isQuoteFresh(0.97, 1.0)).toBe(false);
  });
});
