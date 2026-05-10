export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

const ENDPOINT = 'https://api.mapbox.com/search/searchbox/v1/forward';

type Feature = {
  type: 'Feature';
  id: string;
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    name: string;
    name_preferred?: string;
    place_formatted?: string;
    feature_type?: string;
    full_address?: string;
  };
};

export async function searchPlaces(query: string, token: string): Promise<Place[]> {
  const q = query.trim();
  if (!q) return [];

  const params = new URLSearchParams({
    q,
    access_token: token,
    limit: '8',
    language: 'sv,en',
    types: 'poi,address,place,locality,neighborhood,district,street',
  });
  const url = `${ENDPOINT}?${params.toString()}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: Feature[] };
    return (data.features ?? []).map((f) => {
      const name = f.properties.name_preferred ?? f.properties.name;
      const ctx = f.properties.place_formatted ?? f.properties.full_address ?? '';
      return {
        id: f.id,
        name: ctx ? `${name}, ${ctx}` : name,
        lng: f.geometry.coordinates[0],
        lat: f.geometry.coordinates[1],
      };
    });
  } catch {
    return [];
  }
}
