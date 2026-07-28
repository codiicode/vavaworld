'use client';

import { cellToLatLng } from 'h3-js';
import { getSupabase } from './supabase';
import { CITIES } from '@/components/landing/landing-cities';

/**
 * Geo-located "a hex was just claimed" ping source for the landing globe. One
 * shared, ref-counted stream that fuses three inputs into {lon,lat} pings:
 *
 *   1. Supabase Realtime  - INSERT on the `hexes` table = a real cross-user
 *      claim from anywhere (the buyer doesn't have to be you).
 *   2. Local claim-done   - the buyer's own claim in this tab, instant.
 *   3. Mock heartbeat      - keeps the globe alive on low-volume devnet.
 *
 * The globe subscribes imperatively (canvas loop), so this is a tiny pub/sub
 * rather than React state.
 */
export type ClaimPing = {
  lon: number;
  lat: number;
  // Optional metadata for the globe's hover card. Mock + local claims fill it
  // in; Realtime fills what the row exposes (owner, price).
  handle?: string;
  city?: string;
  hexes?: number;
  priceSol?: number;
};
type Cb = (p: ClaimPing) => void;

const HANDLES = [
  'vavaqueen', 'tokyodrift', 'brooklyn', 'marais', 'paulista', 'whale',
  'gangnam', 'jordaan', 'nordicwhale', 'pixel_baron', 'frostbyte', 'maptiger',
  'aurora', 'kbh_kim', 'shibuyaSam', 'lisbon_lu',
];

/** A believable mock claim near city `i` - jittered position + plausible meta. */
function mockPing(i: number): ClaimPing {
  const c = CITIES[i];
  const hexes = 1 + Math.floor(Math.random() * 12);
  return {
    lon: c.lon + (Math.random() - 0.5) * 2.5,
    lat: c.lat + (Math.random() - 0.5) * 2.5,
    city: c.name,
    handle: HANDLES[(i * 7 + 3) % HANDLES.length],
    hexes,
    priceSol: +(0.04 + Math.random() * 2.2).toFixed(2),
  };
}

function shortAddr(addr: string) {
  return addr.length > 9 ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : addr;
}

const subs = new Set<Cb>();
let started = false;
let mockTimer: number | null = null;
let channel: ReturnType<NonNullable<ReturnType<typeof getSupabase>>['channel']> | null = null;
let onLocal: ((e: Event) => void) | null = null;

function emit(p: ClaimPing) {
  subs.forEach((cb) => cb(p));
}

function pingFromH3(h3: string, extra?: Partial<ClaimPing>) {
  try {
    const [lat, lon] = cellToLatLng(h3);
    emit({ lon, lat, ...extra });
  } catch {
    /* invalid cell - skip */
  }
}

function start() {
  if (started || typeof window === 'undefined') return;
  started = true;

  // Mock heartbeat - a believable trickle so the globe always feels live.
  let i = 7;
  mockTimer = window.setInterval(() => {
    if (document.hidden) return;
    i = (i * 7 + 3) % CITIES.length;
    emit(mockPing(i));
  }, 3500);

  // Real cross-user claims.
  const sb = getSupabase();
  if (sb) {
    channel = sb
      .channel('hex-claims')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'hexes' },
        (payload) => {
          const row = payload.new as { h3_id?: string; owner?: string; purchase_price?: number };
          if (!row?.h3_id) return;
          // purchase_price unit is unknown across envs - treat large values as lamports.
          const raw = row.purchase_price;
          const priceSol =
            typeof raw === 'number' ? (raw > 1e6 ? raw / 1e9 : raw) : undefined;
          pingFromH3(row.h3_id, {
            handle: row.owner ? shortAddr(row.owner) : undefined,
            hexes: 1,
            priceSol: priceSol != null ? +priceSol.toFixed(2) : undefined,
          });
        },
      )
      .subscribe();
  }

  // The local buyer's own claim (same tab) for instant feedback.
  onLocal = (e: Event) => {
    const detail = (e as CustomEvent<{ h3s?: string[] }>).detail;
    const h3s = detail?.h3s ?? [];
    h3s.forEach((h3) => pingFromH3(h3, { handle: 'you', hexes: h3s.length }));
  };
  window.addEventListener('vavaworld:claim-done', onLocal);
}

function stop() {
  if (mockTimer != null) {
    window.clearInterval(mockTimer);
    mockTimer = null;
  }
  if (channel) {
    getSupabase()?.removeChannel(channel);
    channel = null;
  }
  if (onLocal) {
    window.removeEventListener('vavaworld:claim-done', onLocal);
    onLocal = null;
  }
  started = false;
}

export function subscribeClaimPings(cb: Cb): () => void {
  subs.add(cb);
  start();
  return () => {
    subs.delete(cb);
    if (subs.size === 0) stop();
  };
}
