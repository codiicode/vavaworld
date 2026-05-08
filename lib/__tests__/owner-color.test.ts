import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { ownerColor } from '../owner-color';

describe('ownerColor', () => {
  it('returns an HSL string', () => {
    const c = ownerColor(new PublicKey('GNfEEPYES1k2sZnoBfWbA51zYZVSyeB46te6EyL8CzBt'));
    expect(c).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });

  it('is deterministic for same pubkey', () => {
    const k = new PublicKey('GNfEEPYES1k2sZnoBfWbA51zYZVSyeB46te6EyL8CzBt');
    expect(ownerColor(k)).toBe(ownerColor(k));
  });

  it('differs for different pubkeys', () => {
    const a = ownerColor(new PublicKey('GNfEEPYES1k2sZnoBfWbA51zYZVSyeB46te6EyL8CzBt'));
    const b = ownerColor(new PublicKey('11111111111111111111111111111111'));
    expect(a).not.toBe(b);
  });
});
