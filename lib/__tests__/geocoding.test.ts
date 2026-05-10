import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchPlaces, type Place } from '../geocoding';

describe('searchPlaces (Mapbox Search Box v6)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed place results with name + context', async () => {
    const fakeResp = {
      features: [
        {
          type: 'Feature',
          id: 'a',
          geometry: { type: 'Point', coordinates: [13.405, 52.52] },
          properties: { name: 'Berlin', place_formatted: 'Germany', feature_type: 'place' },
        },
        {
          type: 'Feature',
          id: 'b',
          geometry: { type: 'Point', coordinates: [-71.18, 44.46] },
          properties: { name: 'Berlin', place_formatted: 'NH, USA', feature_type: 'place' },
        },
      ],
    };
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => fakeResp,
    } as Response);

    const out: Place[] = await searchPlaces('berlin', 'pk.test');
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: 'a', name: 'Berlin, Germany', lat: 52.52, lng: 13.405 });
  });

  it('returns empty array on empty query', async () => {
    expect(await searchPlaces('', 'pk.test')).toEqual([]);
    expect(await searchPlaces('   ', 'pk.test')).toEqual([]);
  });

  it('returns empty array on fetch error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    expect(await searchPlaces('berlin', 'pk.test')).toEqual([]);
  });
});
