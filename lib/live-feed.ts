'use client';

import { useEffect, useState } from 'react';

/**
 * Mock "world is alive" claim stream. Drives the landing-page ticker and the
 * /map live feed so the product feels like a real-time land grab. Swap the
 * generator for the on-chain indexer's websocket/poll when it ships - the
 * `ClaimEvent` shape and the hooks stay the same.
 */
export type ClaimEvent = {
  id: string;
  handle: string;
  city: string;
  country: string; // ISO 3166-1 alpha-2, lowercase
};

const CITIES: ReadonlyArray<{ city: string; country: string }> = [
  { city: 'Tokyo', country: 'jp' }, { city: 'Stockholm', country: 'se' },
  { city: 'Berlin', country: 'de' }, { city: 'New York', country: 'us' },
  { city: 'Paris', country: 'fr' }, { city: 'London', country: 'gb' },
  { city: 'Seoul', country: 'kr' }, { city: 'São Paulo', country: 'br' },
  { city: 'Lisbon', country: 'pt' }, { city: 'Amsterdam', country: 'nl' },
  { city: 'Sydney', country: 'au' }, { city: 'Toronto', country: 'ca' },
  { city: 'Madrid', country: 'es' }, { city: 'Rome', country: 'it' },
  { city: 'Oslo', country: 'no' }, { city: 'Copenhagen', country: 'dk' },
  { city: 'Mumbai', country: 'in' }, { city: 'Shanghai', country: 'cn' },
  { city: 'Helsinki', country: 'fi' }, { city: 'Gothenburg', country: 'se' },
];

const HANDLES: ReadonlyArray<string> = [
  'vavaqueen', 'tokyodrift', 'brooklyn', 'marais', 'paulista', 'whale',
  'gangnam', 'jordaan', 'nordicwhale', 'pixel_baron', 'frostbyte', 'maptiger',
  'aurora', 'kbh_kim', 'helsinkiHawk', 'shibuyaSam', 'lisbon_lu', 'berlinBär',
];

// Deterministic pick so SSR and first client render agree (no hydration flash).
function eventAt(seed: number): ClaimEvent {
  const c = CITIES[seed % CITIES.length];
  const h = HANDLES[(seed * 7 + 3) % HANDLES.length];
  return { id: `c${seed}`, handle: h, city: c.city, country: c.country };
}

/** A stable initial batch of recent claims (newest first). */
export function recentClaims(n: number): ClaimEvent[] {
  return Array.from({ length: n }, (_, i) => eventAt(i));
}

/**
 * Rolling claim stream: starts with `initial` events and prepends a fresh one
 * every `intervalMs`. Generation is deferred to the client (after mount) so it
 * never causes a hydration mismatch. `max` caps the retained list.
 */
export function useLiveClaims(intervalMs = 4500, initial = 6, max = 20): ClaimEvent[] {
  const [events, setEvents] = useState<ClaimEvent[]>(() => recentClaims(initial));

  useEffect(() => {
    let seed = 1000;
    const tick = () => {
      seed += 1;
      setEvents((prev) => [eventAt(seed), ...prev].slice(0, max));
    };
    const t = window.setInterval(() => {
      if (!document.hidden) tick();
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [intervalMs, max]);

  return events;
}
