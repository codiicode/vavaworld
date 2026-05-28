'use client';

import { useEffect, useState } from 'react';

const cache = new Map<string, Region>();

export type Region = {
  city: string | null;
  neighborhood: string | null;
  /** ISO 3166-1 alpha-2 (lowercase from Mapbox) */
  countryCode: string | null;
  countryName: string | null;
  display: string;
};

type MapboxFeature = {
  text?: string;
  place_type?: string[];
  properties?: { short_code?: string };
  context?: Array<{ id: string; text: string; short_code?: string }>;
};

/**
 * Reverse-geocode the viewport centre. Snaps to ~5km cells before hitting the API
 * so neighbour pans reuse the same cache key.
 */
export function useReverseGeocode(
  lat: number | null,
  lng: number | null,
  active: boolean,
): Region | null {
  const [region, setRegion] = useState<Region | null>(null);

  useEffect(() => {
    if (!active || lat == null || lng == null) {
      setRegion(null);
      return;
    }
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const cached = cache.get(key);
    if (cached) {
      setRegion(cached);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=neighborhood,locality,place,country&limit=1&access_token=${token}`;
        const r = await fetch(url);
        if (!r.ok) return;
        const data: { features?: MapboxFeature[] } = await r.json();
        if (cancelled) return;
        const feat = data.features?.[0];
        if (!feat) return;

        let countryCode: string | null = null;
        let countryName: string | null = null;
        let city: string | null = null;
        let neighborhood: string | null = null;

        const types = feat.place_type ?? [];
        if (types.includes('country')) {
          countryCode = feat.properties?.short_code ?? null;
          countryName = feat.text ?? null;
        } else if (types.includes('place')) {
          city = feat.text ?? null;
        } else if (types.includes('neighborhood') || types.includes('locality')) {
          neighborhood = feat.text ?? null;
        }
        for (const ctx of feat.context ?? []) {
          if (ctx.id.startsWith('country') && !countryCode) {
            countryCode = ctx.short_code ?? null;
            countryName = ctx.text ?? null;
          } else if (ctx.id.startsWith('place') && !city) {
            city = ctx.text;
          } else if ((ctx.id.startsWith('neighborhood') || ctx.id.startsWith('locality')) && !neighborhood) {
            neighborhood = ctx.text;
          }
        }
        const display =
          neighborhood && city ? `${neighborhood}, ${city}` :
          city ? city :
          neighborhood ? neighborhood :
          countryName ?? 'Unmapped';
        const next: Region = { city, neighborhood, countryCode, countryName, display };
        cache.set(key, next);
        setRegion(next);
      } catch {
        /* offline - silent */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [active, lat, lng]);

  return region;
}
