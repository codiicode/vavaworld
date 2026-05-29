// Mock leaderboard - replaces a real indexer/ranking query until one exists.
// Deterministic generator so ranks/values are stable across renders & builds.

export interface LeaderboardEntry {
  rank: number;
  username: string;
  walletAddress: string;
  country: string;
  countryFlag: string;
  hexes: number;
  valueSOL: number;
  valueUSD: number;
  volume24h: number;
  countries: number;
  bonded: number; // $VAVA bonded
  verified: boolean;
  rankDelta: number; // position change vs the previous snapshot (+up / -down / 0)
  isYou?: boolean; // the signed-in user's own row (mock: one fixed entry)
  // Per-country breakdown. The leaderboard's country scope ranks on these, NOT
  // on the profile `country` flag. Keyed by ISO 3166-1 alpha-2 (lowercase).
  // Worldwide views use the flat totals above; these are the national detail.
  hexesByCountry: Record<string, number>;
  bondedByCountry: Record<string, number>;
  valueByCountry: Record<string, number>; // SOL
}

export const SOL_USD_REF = 152;

const COUNTRIES: ReadonlyArray<{ code: string; flag: string }> = [
  { code: 'se', flag: '🇸🇪' }, { code: 'jp', flag: '🇯🇵' }, { code: 'de', flag: '🇩🇪' },
  { code: 'us', flag: '🇺🇸' }, { code: 'kr', flag: '🇰🇷' }, { code: 'gb', flag: '🇬🇧' },
  { code: 'fr', flag: '🇫🇷' }, { code: 'it', flag: '🇮🇹' }, { code: 'es', flag: '🇪🇸' },
  { code: 'br', flag: '🇧🇷' }, { code: 'cn', flag: '🇨🇳' }, { code: 'in', flag: '🇮🇳' },
  { code: 'au', flag: '🇦🇺' }, { code: 'ca', flag: '🇨🇦' }, { code: 'nl', flag: '🇳🇱' },
  { code: 'pt', flag: '🇵🇹' }, { code: 'no', flag: '🇳🇴' }, { code: 'dk', flag: '🇩🇰' },
  { code: 'fi', flag: '🇫🇮' }, { code: 'kr', flag: '🇰🇷' },
];

const NAMES: ReadonlyArray<string> = [
  'CARL', 'sakura_owns', '@trader_42', 'hexqueen', 'ryoma', 'Andersson',
  'mintlord', '@kojima', 'glaciär', 'NordicWhale', 'tokyo_drift', 'P. Müller',
  '0xVALDIS', 'fjordfox', 'hanbei', '@grid_god', 'Lucia', 'shibuyaSam',
  'KRONA', 'pixel_baron', '@yuki', 'Olsen', 'maptiger', 'cnhodler',
  'rajesh_b', '@aussie_acres', 'mapleLeaf', 'dutchmaster', 'lisbon_lu',
  'auroraSeeker', 'kbh_kim', 'helsinkiHawk', '@vael', 'GENESIS', 'mochi',
  'stockholmStan', 'parktae', 'berlinBär', '@frostbyte', 'kioskKid',
  'romaRosa', 'madridM', 'saoPete', 'greatWallG', 'mumbaiMax',
  'sydneySage', 'torontoT', 'amsterAce', 'portoP', 'tromsoTed',
];

// xmur3-ish tiny deterministic PRNG so the dataset never shuffles.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const DISTINCT_CODES = Array.from(new Set(COUNTRIES.map((c) => c.code)));

/**
 * Spread a global total across `count` distinct countries (the user's profile
 * country first and biggest), with a decaying weight curve so holdings feel
 * concentrated in a home turf plus a long tail. Deterministic per `pr`.
 */
function distribute(
  total: number,
  home: string,
  count: number,
  pr: () => number,
): Record<string, number> {
  const others = DISTINCT_CODES.filter((c) => c !== home).sort(() => pr() - 0.5);
  const codes = [home, ...others.slice(0, Math.max(0, count - 1))];
  const weights = codes.map((_, k) => Math.pow(0.55, k) * (0.7 + pr() * 0.6));
  const sum = weights.reduce((a, b) => a + b, 0);
  const map: Record<string, number> = {};
  codes.forEach((c, k) => {
    map[c] = Math.max(1, Math.round((total * weights[k]) / sum));
  });
  return map;
}

function build(): LeaderboardEntry[] {
  const r = rng(42);
  const out: LeaderboardEntry[] = [];
  for (let i = 0; i < 50; i++) {
    const rank = i + 1;
    // Hexes: rank 1 ≈ 2.5M, rank 50 ≈ 250k - smooth decay + a little jitter.
    const t = i / 49;
    const baseHex = 2_500_000 * Math.pow(0.36, t); // 2.5M → ~900k path
    const hexes = Math.round((baseHex + (0.5 - r()) * 40_000) / 1000) * 1000;
    const valueSOL = Math.round((520 * Math.pow(0.40, t) + (0.5 - r()) * 8) * 10) / 10;
    const valueUSD = Math.round(valueSOL * 152);
    const vol = Math.round((r() * 60 - 18) * 10) / 10; // ~70% positive
    // Bonded $VAVA: rank 1 ≈ 3.2M, rank 50 ≈ ~60k - smooth decay + jitter.
    const bonded = Math.round((3_200_000 * Math.pow(0.34, t) + (0.5 - r()) * 50_000) / 1000) * 1000;
    const country = COUNTRIES[i % COUNTRIES.length];
    const finalHexes = Math.max(250_000, hexes);
    const finalValue = Math.max(82, valueSOL);
    const finalBonded = Math.max(50_000, bonded);
    const spread = Math.max(1, Math.round(38 * Math.pow(0.5, t) + r() * 3));
    // Distinct rng per entry so portfolio spread never disturbs the main stream.
    const pr = rng(1000 + i);
    out.push({
      rank,
      username: NAMES[i % NAMES.length],
      walletAddress: `${(i * 7 + 11).toString(16).padStart(4, '0')}…${(i * 13 + 3)
        .toString(16)
        .padStart(4, '0')}`,
      country: country.code,
      countryFlag: country.flag,
      hexes: finalHexes,
      valueSOL: finalValue,
      valueUSD,
      volume24h: vol,
      countries: spread,
      bonded: finalBonded,
      verified: r() > 0.45,
      // Deterministic, index-derived so it never reshuffles the rest of the row.
      rankDelta: ((i * 7 + 3) % 11) - 5,
      isYou: rank === 23,
      hexesByCountry: distribute(finalHexes, country.code, spread, pr),
      bondedByCountry: distribute(finalBonded, country.code, spread, pr),
      valueByCountry: distribute(finalValue, country.code, spread, pr),
    });
  }
  return out;
}

export const mockLeaderboard: LeaderboardEntry[] = build();

export const TOTAL_HOLDERS = 2847;

// ── scope resolution ──────────────────────────────────────────────
// 'worldwide' ranks on global totals; an ISO code ranks on holdings *in that
// country*. The profile flag never decides who appears on a national board -
// only actual ownership does.

export type Scope = 'worldwide' | string;

export type ScopeStats = {
  hexes: number;
  bonded: number;
  valueSOL: number;
  valueUSD: number;
};

export function statsForScope(e: LeaderboardEntry, scope: Scope): ScopeStats {
  if (scope === 'worldwide') {
    return { hexes: e.hexes, bonded: e.bonded, valueSOL: e.valueSOL, valueUSD: e.valueUSD };
  }
  const valueSOL = e.valueByCountry[scope] ?? 0;
  return {
    hexes: e.hexesByCountry[scope] ?? 0,
    bonded: e.bondedByCountry[scope] ?? 0,
    valueSOL,
    valueUSD: Math.round(valueSOL * SOL_USD_REF),
  };
}

/** Whether the entry has any presence in the scope (always true worldwide). */
export function ownsInScope(e: LeaderboardEntry, scope: Scope): boolean {
  return scope === 'worldwide' || (e.hexesByCountry[scope] ?? 0) > 0;
}

/** A scope-resolved, ranked row - what the podium/table/rows actually render. */
export type RowView = {
  entry: LeaderboardEntry;
  rank: number;
  hexes: number;
  bonded: number;
  valueSOL: number;
  valueUSD: number;
  countries: number;
  isPresident: boolean; // country scope only: the #1 bonder = the president
};
