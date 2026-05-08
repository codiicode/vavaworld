export type Place = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

const ENDPOINT = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

export async function searchPlaces(query: string, token: string): Promise<Place[]> {
  const q = query.trim();
  if (!q) return [];

  const url = `${ENDPOINT}/${encodeURIComponent(q)}.json?access_token=${token}&limit=5`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: Array<{ id: string; place_name: string; center: [number, number] }> };
    return (data.features ?? []).map((f) => ({
      id: f.id,
      name: f.place_name,
      lng: f.center[0],
      lat: f.center[1],
    }));
  } catch {
    return [];
  }
}
