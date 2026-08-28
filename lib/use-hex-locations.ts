'use client';

import { useEffect, useState } from 'react';
import { cellToParent } from 'h3-js';
import { hexCenter } from './h3-utils';

export type HexLocation = {
  h3: string;
  lat: number;
  lng: number;
  /** ISO 3166-1 alpha-2, lowercase from Mapbox */
  countryCode: string | null;
  countryName: string | null;
  /** Town / city name (Mapbox "place" feature) */
  place: string | null;
  /** Neighborhood / locality */
  neighborhood: string | null;
  /** "Stockholm, Sweden" or "Pacific Ocean" etc., for one-line display */
  display: string;
};

// Module-level cache survives unmount/remount, scoped to the browser session.
const cache = new Map<string, HexLocation>();

// Geocoding is shared per res-9 parent cell (~174 m edge): res-12 hexes are
// metres apart, so a 1000-hex selection is one city block - geocoding each
// hex individually meant up to 1000 Mapbox calls for identical answers
// (slow, and it burns the geocoding quota). One call per parent covers all.
const GEO_RES = 9;
type GeoFields = Pick<HexLocation, 'countryCode' | 'countryName' | 'place' | 'neighborhood' | 'display'>;
const parentCache = new Map<string, GeoFields>();
const inflight = new Map<string, Promise<GeoFields | null>>();

type MapboxFeature = {
  text?: string;
  place_name?: string;
  place_type?: string[];
  properties?: { short_code?: string };
  context?: Array<{ id: string; text: string; short_code?: string }>;
};

async function fetchOne(h3: string, token: string): Promise<HexLocation | null> {
  if (cache.has(h3)) return cache.get(h3)!;
  const { lat, lng } = hexCenter(h3);
  const parent = cellToParent(h3, GEO_RES);

  const cachedGeo = parentCache.get(parent);
  if (cachedGeo) {
    const loc: HexLocation = { h3, lat, lng, ...cachedGeo };
    cache.set(h3, loc);
    return loc;
  }

  const geo = await (inflight.get(parent) ?? fetchParentGeo(parent, token));
  if (!geo) return null;
  const loc: HexLocation = { h3, lat, lng, ...geo };
  cache.set(h3, loc);
  return loc;
}

function fetchParentGeo(parent: string, token: string): Promise<GeoFields | null> {
  const { lat, lng } = hexCenter(parent);
  const promise = (async (): Promise<GeoFields | null> => {
    try {
      // Use classic v5 geocoding - it returns context arrays we can mine for country / region
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,neighborhood,locality,country&limit=1&access_token=${token}`;
      const r = await fetch(url);
      if (!r.ok) return null;
      const data: { features?: MapboxFeature[] } = await r.json();
      const feat = data.features?.[0];
      if (!feat) {
        const geo: GeoFields = {
          countryCode: null,
          countryName: null,
          place: null,
          neighborhood: null,
          display: 'Unmapped',
        };
        parentCache.set(parent, geo);
        return geo;
      }
      // Pull country + city out of the feature + its context chain.
      let countryCode: string | null = null;
      let countryName: string | null = null;
      let place: string | null = null;
      let neighborhood: string | null = null;
      const types = feat.place_type ?? [];
      if (types.includes('country')) {
        countryCode = feat.properties?.short_code ?? null;
        countryName = feat.text ?? null;
      } else if (types.includes('place')) {
        place = feat.text ?? null;
      } else if (types.includes('neighborhood') || types.includes('locality')) {
        neighborhood = feat.text ?? null;
      }
      for (const ctx of feat.context ?? []) {
        if (ctx.id.startsWith('country') && !countryCode) {
          countryCode = ctx.short_code ?? null;
          countryName = ctx.text ?? null;
        } else if (ctx.id.startsWith('place') && !place) {
          place = ctx.text;
        } else if ((ctx.id.startsWith('neighborhood') || ctx.id.startsWith('locality')) && !neighborhood) {
          neighborhood = ctx.text;
        }
      }
      const display =
        place && countryName ? `${place}, ${countryName}` :
        countryName ? countryName :
        place ?? 'Unmapped';
      const geo: GeoFields = { countryCode, countryName, place, neighborhood, display };
      parentCache.set(parent, geo);
      return geo;
    } catch {
      return null;
    } finally {
      inflight.delete(parent);
    }
  })();
  inflight.set(parent, promise);
  return promise;
}

/**
 * Reverse-geocode every hex in `hexes`. Cached per hex-id for the session.
 * Returns the resolved subset - hexes not yet resolved are simply missing.
 */
export function useHexLocations(hexes: Iterable<string>): Map<string, HexLocation> {
  const [resolved, setResolved] = useState<Map<string, HexLocation>>(() => new Map());

  const ids = Array.from(hexes);
  const key = ids.join('|');

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    let cancelled = false;
    // Hydrate from cache immediately
    const initial = new Map<string, HexLocation>();
    for (const h3 of ids) {
      const cached = cache.get(h3);
      if (cached) initial.set(h3, cached);
    }
    setResolved(initial);

    // Fire off requests for anything not yet cached
    const todo = ids.filter((h3) => !cache.has(h3));
    if (todo.length === 0) return;
    (async () => {
      const results = await Promise.all(todo.map((h3) => fetchOne(h3, token)));
      if (cancelled) return;
      setResolved((prev) => {
        const next = new Map(prev);
        results.forEach((loc, i) => {
          if (loc) next.set(todo[i], loc);
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return resolved;
}
