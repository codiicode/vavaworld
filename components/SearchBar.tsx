'use client';

import { useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { searchPlaces, type Place } from '@/lib/geocoding';

export function SearchBar({ mapRef }: { mapRef: React.RefObject<MapRef | null> }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const debounceRef = useRef<number | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      const r = await searchPlaces(q, token);
      setResults(r);
      setOpen(r.length > 0);
      setActive(0);
    }, 200);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [q, token]);

  const select = (p: Place) => {
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 14, duration: 1500 });
    setQ(p.name);
    setOpen(false);
  };

  return (
    <div className="absolute top-4 left-4 z-20 w-80">
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
          if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
          if (e.key === 'Enter')     { e.preventDefault(); if (results[active]) select(results[active]); }
          if (e.key === 'Escape')    { setOpen(false); setQ(''); }
        }}
        placeholder="Sök adress eller plats..."
        className="w-full px-3 py-2 bg-[var(--panel)] border border-[var(--border)] text-[var(--fg)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--fg)]"
      />
      {open && results.length > 0 && (
        <ul className="mt-1 bg-[var(--panel)] border border-[var(--border)]">
          {results.map((p, i) => (
            <li
              key={p.id}
              onClick={() => select(p)}
              className={
                'px-3 py-2 text-sm cursor-pointer ' +
                (i === active ? 'bg-[var(--bg)]' : 'hover:bg-[var(--bg)]')
              }
            >
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
