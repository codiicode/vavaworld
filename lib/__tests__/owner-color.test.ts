import { describe, it, expect } from 'vitest';
import { ownerColor } from '../owner-color';

describe('ownerColor', () => {
  it('returns an HSL string', () => {
    const c = ownerColor('GNfEEPYES1k2sZnoBfWbA51zYZVSyeB46te6EyL8CzBt');
    expect(c).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
  });

  it('is deterministic for same pubkey', () => {
    const k = 'GNfEEPYES1k2sZnoBfWbA51zYZVSyeB46te6EyL8CzBt';
    expect(ownerColor(k)).toBe(ownerColor(k));
  });

  it('differs for different pubkeys', () => {
    const a = ownerColor('GNfEEPYES1k2sZnoBfWbA51zYZVSyeB46te6EyL8CzBt');
    const b = ownerColor('11111111111111111111111111111111');
    expect(a).not.toBe(b);
  });
});
