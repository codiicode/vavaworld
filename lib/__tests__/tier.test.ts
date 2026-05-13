import { describe, it, expect } from 'vitest';
import { classifyTier } from '../tier';

describe('classifyTier (bbox-based, mirrors on-chain)', () => {
  it('tier 1 inside NYC bbox', () => {
    expect(classifyTier(40.75, -74.0)).toBe(1);
  });
  it('tier 1 inside Stockholm bbox', () => {
    expect(classifyTier(59.3293, 18.0686)).toBe(1);
  });
  it('tier 1 short-circuits on Tokyo (first entry)', () => {
    expect(classifyTier(35.6895, 139.6917)).toBe(1);
  });
  it('tier 2 ~120km from NYC', () => {
    expect(classifyTier(41.5, -72.5)).toBe(2);
  });
  it('tier 3 mid-Pacific', () => {
    expect(classifyTier(0, -160)).toBe(3);
  });
});
