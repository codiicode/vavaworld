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
export type ClaimPing = { lon: number; lat: number };
type Cb = (p: ClaimPing) => void;

const subs = new Set<Cb>();
let started = false;
let mockTimer: number | null = null;
let channel: ReturnType<NonNullable<ReturnType<typeof getSupabase>>['channel']> | null = null;
let onLocal: ((e: Event) => void) | null = null;

function emit(p: ClaimPing) {
  subs.forEach((cb) => cb(p));
}

function pingFromH3(h3: string) {
  try {
    const [lat, lon] = cellToLatLng(h3);
    emit({ lon, lat });
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
    const c = CITIES[i];
    emit({ lon: c.lon + (Math.random() - 0.5) * 2.5, lat: c.lat + (Math.random() - 0.5) * 2.5 });
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
          const h3 = (payload.new as { h3_id?: string })?.h3_id;
          if (h3) pingFromH3(h3);
        },
      )
      .subscribe();
  }

  // The local buyer's own claim (same tab) for instant feedback.
  onLocal = (e: Event) => {
    const detail = (e as CustomEvent<{ h3s?: string[] }>).detail;
    (detail?.h3s ?? []).forEach(pingFromH3);
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
