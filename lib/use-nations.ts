'use client';

import { useEffect, useState } from 'react';
import type { Nation } from './mock-nations';
import { apiToNation, type ApiNation } from './nation-map';

/** Real nations list from /api/nations (indexer aggregates). */
export function useNations(): { nations: Nation[]; loading: boolean } {
  const [nations, setNations] = useState<Nation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch('/api/nations', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { nations: ApiNation[] }) => {
        if (alive) setNations((json.nations ?? []).map(apiToNation));
      })
      .catch(() => {
        if (alive) setNations([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { nations, loading };
}
