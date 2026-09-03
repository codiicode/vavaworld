'use client';

import { useEffect, useState } from 'react';
import type { ActivityItem } from './mock-marketplace';
import { COUNTRIES } from './countries';

const COUNTRY_NAME = new Map(COUNTRIES.map((c) => [c.code, c.name]));

type ApiEvent = {
  type: 'claim' | 'sale';
  h3Id: string;
  from: string | null;
  fromUsername: string | null;
  to: string;
  toUsername: string | null;
  countryIso: string;
  countryName: string;
  count: number;
  priceSol: number;
  at: string;
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
 * Real activity feed: primary claims render as "buy" (from the world
 * itself - empty fromAddr shows a dash), secondary sales as "sell".
 */
export function useActivity(): { items: ActivityItem[]; loading: boolean } {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch('/api/activity', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { events: ApiEvent[] }) => {
        if (!alive) return;
        setItems(
          (json.events ?? []).map((e, i) => ({
            id: `${e.type}-${e.h3Id}-${i}`,
            countryCode: e.countryIso,
            city: COUNTRY_NAME.get(e.countryIso) ?? e.countryName,
            neighborhood:
              e.count > 1
                ? `${e.count.toLocaleString('en-US')} hexes`
                : `${e.h3Id.slice(0, 5)}…${e.h3Id.slice(-4)}`,
            fromAddr: e.from ?? '',
            toAddr: e.to,
            price: e.priceSol,
            ago: relAgo(e.at),
            action: e.type === 'sale' ? ('sell' as const) : ('buy' as const),
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
