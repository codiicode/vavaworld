/**
 * The Vault: nations locked at launch. A locked nation prices no quotes -
 * the server refuses to sign, so no claim can settle there, regardless of
 * anything a client does. Shared by server routes and the map UI so both
 * always agree.
 *
 * `unlockAt` is an ISO timestamp; null = locked indefinitely. Past
 * timestamps unlock automatically - flipping a date here and pushing is
 * the whole release process.
 */
export const LOCKED_COUNTRIES: Record<string, { name: string; unlockAt: string | null }> = {
  GL: { name: 'Greenland', unlockAt: null },
  KP: { name: 'North Korea', unlockAt: null },
  VA: { name: 'Vatican City', unlockAt: null },
  MC: { name: 'Monaco', unlockAt: null },
  HK: { name: 'Hong Kong', unlockAt: null },
};

export type LockedInfo = { iso: string; name: string; unlockAt: string | null };

/** The lock entry for a nation, or null once its unlock time has passed. */
export function lockedInfo(iso: string, now = Date.now()): LockedInfo | null {
  const key = iso.toUpperCase();
  const e = LOCKED_COUNTRIES[key];
  if (!e) return null;
  if (e.unlockAt !== null && Date.parse(e.unlockAt) <= now) return null;
  return { iso: key, ...e };
}

/** Currently locked ISO codes (uppercase), for map styling. */
export function lockedIsos(now = Date.now()): string[] {
  return Object.keys(LOCKED_COUNTRIES).filter((iso) => lockedInfo(iso, now) !== null);
}
