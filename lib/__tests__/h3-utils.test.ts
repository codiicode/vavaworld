import { describe, it, expect } from 'vitest';
import { hexesForBounds, hexToFeature, HEX_RES } from '../h3-utils';

describe('hexesForBounds', () => {
  it('returns a non-empty set for a small bbox', () => {
    // Manhattan-ish bbox
    const hexes = hexesForBounds([-74.02, 40.70, -73.95, 40.79]);
    expect(hexes.length).toBeGreaterThan(0);
    expect(hexes[0]).toMatch(/^[0-9a-f]{15}$/);
  });

  it('caps at safety limit for huge bbox', () => {
    // World — guard against runaway
    const hexes = hexesForBounds([-180, -85, 180, 85]);
    expect(hexes.length).toBeLessThanOrEqual(20000);
  });
});

describe('hexToFeature', () => {
  it('produces a GeoJSON Polygon feature with the h3 id', () => {
    const [hex] = hexesForBounds([-74.0, 40.74, -73.99, 40.75]);
    const f = hexToFeature(hex);
    expect(f.type).toBe('Feature');
    expect(f.geometry.type).toBe('Polygon');
    expect(f.properties?.h3).toBe(hex);
  });
});

describe('HEX_RES', () => {
  it('is resolution 10', () => {
    expect(HEX_RES).toBe(10);
  });
});
