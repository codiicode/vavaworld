import { describe, it, expect } from 'vitest';
import { classifyTier, haversineKm } from '../tier';

describe('haversineKm', () => {
  it('returns 0 for identical points', () => {
    expect(haversineKm(40.7128, -74.0060, 40.7128, -74.0060)).toBeCloseTo(0, 3);
  });
  it('NYC to LA ~3944 km', () => {
    const d = haversineKm(40.7128, -74.0060, 34.0522, -118.2437);
    expect(d).toBeGreaterThan(3900);
    expect(d).toBeLessThan(4000);
  });
});

describe('classifyTier', () => {
  it('tier 1 inside 50km of NYC', () => {
    expect(classifyTier(40.75, -74.00)).toBe(1);
  });
  it('tier 2 ~120km from NYC (offshore, away from cities)', () => {
    expect(classifyTier(41.5, -72.5)).toBe(2);
  });
  it('tier 3 mid-Pacific', () => {
    expect(classifyTier(0, -160)).toBe(3);
  });
});
