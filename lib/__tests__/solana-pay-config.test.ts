import { describe, expect, it } from 'vitest';
import { formatForeign, isForeignCurrency, usdToForeignUnits } from '../solana-pay-config';

describe('usdToForeignUnits', () => {
  it('prices USDC 1:1 plus the surcharge, in 6-decimal units', () => {
    // $10 * 1.01 = $10.10 -> 10_100_000 units
    expect(usdToForeignUnits(10, 'usdc', 150)).toBe(10_100_000n);
  });

  it('prices SOL at the live rate plus the surcharge, rounded up', () => {
    // $15 * 1.01 / $150 = 0.101 SOL = 101_000_000 lamports
    expect(usdToForeignUnits(15, 'sol', 150)).toBe(101_000_000n);
  });

  it('never rounds a payment down', () => {
    // $0.10 * 1.01 / 150 = 0.000673333.. SOL -> ceil to 673_334 lamports
    expect(usdToForeignUnits(0.1, 'sol', 150)).toBe(673_334n);
  });

  it('refuses a SOL quote without a rate', () => {
    expect(() => usdToForeignUnits(1, 'sol', 0)).toThrow();
  });
});

describe('formatForeign', () => {
  it('formats USDC with two decimals', () => {
    expect(formatForeign(10_100_000n, 'usdc')).toBe('10.10 USDC');
  });
  it('formats small SOL amounts with enough precision to be meaningful', () => {
    expect(formatForeign(673_334n, 'sol')).toBe('0.000673 SOL');
  });
});

describe('isForeignCurrency', () => {
  it('accepts only sol and usdc', () => {
    expect(isForeignCurrency('sol')).toBe(true);
    expect(isForeignCurrency('usdc')).toBe(true);
    expect(isForeignCurrency('eth')).toBe(false);
    expect(isForeignCurrency(undefined)).toBe(false);
  });
});
