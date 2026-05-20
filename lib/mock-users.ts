// Mock user directory. Replaces the bare SELLERS string array we used to render
// addresses across activity feeds, sale history, etc. Some users have chosen
// a username, others haven't — when a username is set, UI should prefer it.
//
// Every entry maps to a public profile at /u/[handle], where handle is the
// username (without @) when present and the address otherwise.

export type MockUser = {
  addr: string;
  username?: string;
  /** ISO 3166-1 alpha-2, lowercase — drives the country flag chip. */
  country: string;
  /** Mock join date, ISO. */
  joined: string;
  /** Mock summary numbers shown on the public profile. */
  hexes: number;
  countries: number;
  bondedVava: number;
};

export const MOCK_USERS: ReadonlyArray<MockUser> = [
  { addr: '0xA4B2…82F1', username: 'vavaqueen',  country: 'se', joined: '2025-09-12', hexes: 1842, countries: 31, bondedVava: 2_410_000 },
  { addr: '0x8C73…19BD', username: 'tokyodrift', country: 'jp', joined: '2025-10-02', hexes: 1207, countries: 18, bondedVava: 1_780_000 },
  { addr: '0xF4E1…5A72',                          country: 'de', joined: '2025-11-21', hexes:  643, countries: 12, bondedVava:   910_000 },
  { addr: '0x1A9C…4D87', username: 'brooklyn',   country: 'us', joined: '2025-09-30', hexes: 1551, countries: 24, bondedVava: 2_010_000 },
  { addr: '0x6B22…91FE', username: 'marais',     country: 'fr', joined: '2026-01-08', hexes:  982, countries:  9, bondedVava: 1_350_000 },
  { addr: '0x33D8…7762',                          country: 'gb', joined: '2025-12-04', hexes:  724, countries: 14, bondedVava:   880_000 },
  { addr: '0x9012…BBA4', username: 'paulista',   country: 'br', joined: '2026-02-19', hexes:  411, countries:  6, bondedVava:   430_000 },
  { addr: '0xDEAD…BEEF', username: 'whale',      country: 'kr', joined: '2025-08-04', hexes: 3204, countries: 47, bondedVava: 4_120_000 },
  { addr: '0x4422…0011',                          country: 'au', joined: '2026-03-01', hexes:  287, countries:  4, bondedVava:   210_000 },
  { addr: '0xCAFE…BABE', username: 'gangnam',    country: 'kr', joined: '2025-10-17', hexes: 1322, countries: 20, bondedVava: 1_710_000 },
  { addr: '0x7700…5511',                          country: 'pt', joined: '2026-02-02', hexes:  522, countries:  7, bondedVava:   590_000 },
  { addr: '0x9988…AABB', username: 'jordaan',    country: 'nl', joined: '2025-11-08', hexes:  864, countries: 11, bondedVava: 1_020_000 },
];

/** Slug used in /u/[handle] — username (no @) when present, otherwise address. */
export function userHandle(u: { addr: string; username?: string }): string {
  return u.username ?? u.addr;
}

/** Resolve a /u/[handle] segment back to a user. Accepts username or address. */
export function findUserByHandle(handle: string): MockUser | null {
  const decoded = decodeURIComponent(handle);
  const lower = decoded.toLowerCase();
  return (
    MOCK_USERS.find(
      (u) => u.addr === decoded || u.username?.toLowerCase() === lower.replace(/^@/, ''),
    ) ?? null
  );
}

/** Lookup helper for places that already have just an address. */
export function findUserByAddr(addr: string): MockUser | null {
  return MOCK_USERS.find((u) => u.addr === addr) ?? null;
}
