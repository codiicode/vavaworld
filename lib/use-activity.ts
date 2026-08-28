'use client';

import { useEffect, useState } from 'react';
import type { ActivityItem } from './mock-marketplace';
import { COUNTRIES } from './countries';

const COUNTRY_NAME = new Map(COUNTRIES.map((c) => [c.code, c.name]));

type ApiEvent = {
  type: 'claim';
  h3Id: string;
  owner: string;
  username: string | null;
  countryIso: string;
  countryName: string;
  priceUsd: number;
  priceSol: number;
  claimedAt: string;
};

function relAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.max(1, Math.floor(ms / 60_000));
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mo`;
}

/**
 * Real activity feed from /api/activity (primary claims). Mapped into
 * the ActivityItem shape the feed table renders: a claim is a "buy"
 * from the world itself (empty fromAddr renders as a dash).
 */
export function useActivity(): { items: ActivityItem[]; loading: boolean } {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch('/api/activity')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { events: ApiEvent[] }) => {
        if (!alive) return;
        setItems(
          (json.events ?? []).map((e) => ({
            id: e.h3Id,
            countryCode: e.countryIso,
            city: COUNTRY_NAME.get(e.countryIso) ?? e.countryName,
            neighborhood: `${e.h3Id.slice(0, 5)}…${e.h3Id.slice(-4)}`,
            fromAddr: '',
            toAddr: e.owner,
            price: e.priceSol,
            ago: relAgo(e.claimedAt),
            action: 'buy' as const,
          })),
        );
      })
      .catch(() => {
        if (alive) setItems([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { items, loading };
}
