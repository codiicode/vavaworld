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
}

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
    out.push({
      rank,
      username: NAMES[i % NAMES.length],
      walletAddress: `${(i * 7 + 11).toString(16).padStart(4, '0')}…${(i * 13 + 3)
        .toString(16)
        .padStart(4, '0')}`,
      country: country.code,
      countryFlag: country.flag,
      hexes: Math.max(250_000, hexes),
      valueSOL: Math.max(82, valueSOL),
      valueUSD,
      volume24h: vol,
      countries: Math.max(1, Math.round(38 * Math.pow(0.5, t) + r() * 3)),
      bonded: Math.max(50_000, bonded),
      verified: r() > 0.45,
    });
  }
  return out;
}

export const mockLeaderboard: LeaderboardEntry[] = build();

export const TOTAL_HOLDERS = 2847;
