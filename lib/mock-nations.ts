/**
 * Mock governance data for the Nations section. Deterministic per ISO so the
 * list, podium and country pages stay stable across renders. Sweden (SE) uses
 * the exact reference numbers from the brief; every other country is derived
 * pseudo-randomly from its ISO code.
 */
import { COUNTRIES } from './countries';

export type Person = {
  username: string;
  wallet: string;
  bondedVava: number;
  monthlyUsd: number;
};

export type ActivityKind = 'bond' | 'presidency' | 'trade' | 'claim';
export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  /** Rich text segments; `b: true` renders bold (actor names / amounts). */
  parts: { t: string; b?: boolean }[];
  ago: string;
};

export type Nation = {
  iso: string; // uppercase ISO 3166-1 alpha-2
  name: string;
  floor: number;
  claims: number;
  bondedVava: number;
  bonders: number;
  president: Person & { earnedThisMonthUsd: number; termDays: number };
  cabinet: Person[]; // positions #2..#5
  userPosition: {
    rank: number;
    of: number;
    bondedVava: number;
    monthlyUsd: number;
    hexesHere: number;
  };
  activity: ActivityEvent[];
};

// ── formatting helpers ────────────────────────────────────────────
export const fmtUsd3 = (n: number) => `$${n.toFixed(3)}`;
export const fmtInt = (n: number) => n.toLocaleString('en-US');
export const fmtUsd = (n: number) =>
  `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
export function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${+(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}
/** `0x4a3b...92ef` style. */
export const truncAddr = (a: string) =>
  a.length > 10 ? `${a.slice(0, 6)}...${a.slice(-4)}` : a;
export const initials = (name: string) =>
  name.replace(/^@/, '')[0]?.toUpperCase() ?? '?';

// ── deterministic pseudo-random from a string ─────────────────────
function seeded(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h = (h ^= h >>> 16) >>> 0;
    return h / 4294967296;
  };
}

const HANDLES = [
  'orbital', 'meridian', 'glacier', 'cobalt', 'lumen', 'verdant', 'koto',
  'aster', 'nimbus', 'quartz', 'fjord', 'solace', 'vesper', 'onyx', 'cirrus',
  'halcyon', 'marrow', 'pelagic', 'tundra', 'zephyr', 'basalt', 'cinder',
];

function wallet(rnd: () => number): string {
  const hex = '0123456789abcdef';
  let s = '0x';
  for (let i = 0; i < 40; i++) s += hex[Math.floor(rnd() * 16)];
  return s;
}

function person(rnd: () => number, bonded: number, monthly: number): Person {
  const h = HANDLES[Math.floor(rnd() * HANDLES.length)];
  const n = Math.floor(rnd() * 900 + 100);
  return { username: `${h}_${n}`, wallet: wallet(rnd), bondedVava: bonded, monthlyUsd: monthly };
}

function buildActivity(rnd: () => number, name: string): ActivityEvent[] {
  const cities = ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala', 'Lund'];
  const city = () => cities[Math.floor(rnd() * cities.length)];
  const u = () =>
    `@${HANDLES[Math.floor(rnd() * HANDLES.length)]}_${Math.floor(rnd() * 900 + 100)}`;
  const agos = ['just now', '12 min ago', '2 hours ago', '5 hours ago', 'yesterday', '2 days ago'];
  const out: ActivityEvent[] = [];
  for (let i = 0; i < 10; i++) {
    const r = rnd();
    const ago = agos[Math.min(agos.length - 1, Math.floor((i / 10) * agos.length))];
    if (r < 0.45) {
      out.push({
        id: `${name}-a${i}`, kind: 'bond', ago,
        parts: [{ t: u(), b: true }, { t: ' bonded ' }, { t: `${fmtInt(Math.floor(rnd() * 90000 + 10000))} $VAVA`, b: true }, { t: ` to a hex in ${city()}` }],
      });
    } else if (r < 0.6) {
      out.push({
        id: `${name}-a${i}`, kind: 'presidency', ago,
        parts: [{ t: 'Presidency takeover: ' }, { t: u(), b: true }, { t: ' overthrew ' }, { t: u(), b: true }, { t: ' with ' }, { t: `${fmtInt(Math.floor(rnd() * 1_000_000 + 2_000_000))} $VAVA`, b: true }],
      });
    } else if (r < 0.8) {
      out.push({
        id: `${name}-a${i}`, kind: 'trade', ago,
        parts: [{ t: 'Hex sold for ' }, { t: `$${(rnd() * 4 + 0.2).toFixed(2)}`, b: true }, { t: ` in ${city()} · royalty ` }, { t: `$${(rnd() * 0.3).toFixed(2)}`, b: true }, { t: ' to country pool' }],
      });
    } else {
      out.push({
        id: `${name}-a${i}`, kind: 'claim', ago,
        parts: [{ t: 'Primary claim: ' }, { t: u(), b: true }, { t: ' claimed a hex for ' }, { t: `$${(rnd() * 0.5 + 0.1).toFixed(3)}`, b: true }],
      });
    }
  }
  return out;
}

function makeNation(iso: string, name: string): Nation {
  const rnd = seeded(iso);
  const claims = Math.floor(rnd() * 60000 + 500);
  const floor = +(0.1 + claims * 0.00001).toFixed(3);
  const bonders = Math.floor(rnd() * 400 + 8);
  const bondedVava = Math.floor(rnd() * 9_000_000 + 200_000);
  const presBond = Math.floor(rnd() * 2_000_000 + 800_000);
  const president = {
    ...person(rnd, presBond, Math.floor(rnd() * 300 + 40)),
    earnedThisMonthUsd: Math.floor(rnd() * 300 + 40),
    termDays: Math.floor(rnd() * 60 + 3),
  };
  const cabinet = [0.6, 0.42, 0.3, 0.22].map((f) =>
    person(rnd, Math.floor(presBond * f), Math.floor(rnd() * 80 + 20)),
  );
  return {
    iso, name, floor, claims, bondedVava, bonders,
    president,
    cabinet,
    userPosition: {
      rank: Math.floor(rnd() * bonders + 1),
      of: bonders,
      bondedVava: Math.floor(rnd() * 80000 + 5000),
      monthlyUsd: +(rnd() * 8 + 0.5).toFixed(2),
      hexesHere: Math.floor(rnd() * 6),
    },
    activity: buildActivity(rnd, name),
  };
}

// Sweden — exact reference numbers from the brief.
function sweden(): Nation {
  const rnd = seeded('SE-fixed');
  return {
    iso: 'SE',
    name: 'Sweden',
    floor: 0.573,
    claims: 47328,
    bondedVava: 8_400_000,
    bonders: 142,
    president: {
      username: 'aurora_eklund',
      wallet: '0x4a3b7c1d9e2f8a6b5c4d3e2f1a0b9c8d7e6f5a92ef',
      bondedVava: 2_400_000,
      monthlyUsd: 270,
      earnedThisMonthUsd: 270,
      termDays: 23,
    },
    cabinet: [
      person(rnd, 1_800_000, 67),
      person(rnd, 1_200_000, 67),
      person(rnd, 800_000, 67),
      person(rnd, 650_000, 67),
    ],
    userPosition: { rank: 87, of: 142, bondedVava: 50_000, monthlyUsd: 3.21, hexesHere: 3 },
    activity: buildActivity(rnd, 'Sweden'),
  };
}

const BASE: Nation[] = COUNTRIES.map((c) =>
  c.code.toUpperCase() === 'SE' ? sweden() : makeNation(c.code.toUpperCase(), c.name),
);

export const NATIONS: Nation[] = BASE;

export function getNation(iso: string): Nation | null {
  const up = iso.toUpperCase();
  return NATIONS.find((n) => n.iso === up) ?? null;
}

export type NationSort = 'claims' | 'floor' | 'bonded' | 'bonders';
export function sortNations(list: Nation[], sort: NationSort): Nation[] {
  const k: Record<NationSort, (n: Nation) => number> = {
    claims: (n) => n.claims,
    floor: (n) => n.floor,
    bonded: (n) => n.bondedVava,
    bonders: (n) => n.bonders,
  };
  return [...list].sort((a, b) => k[sort](b) - k[sort](a));
}
