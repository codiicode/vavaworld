import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchPlaces, type Place } from '../geocoding';

describe('searchPlaces', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed place results', async () => {
    const fakeResp = {
      features: [
        { id: 'a', place_name: 'Berlin, Germany', center: [13.405, 52.52] },
        { id: 'b', place_name: 'Berlin, NH, USA', center: [-71.18, 44.46] },
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
