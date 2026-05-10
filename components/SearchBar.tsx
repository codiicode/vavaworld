'use client';

import { useEffect, useRef, useState } from 'react';
import type { MapRef } from 'react-map-gl/mapbox';
import { searchPlaces, type Place } from '@/lib/geocoding';

export function SearchBar({ mapRef }: { mapRef: React.RefObject<MapRef | null> }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState(false);
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
    <div className="absolute top-5 left-5 z-20 w-[360px]">
      <div
        className="flex items-center gap-3 px-4 py-3 transition-colors"
        style={{
          background: 'rgba(12, 15, 18, 0.78)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: focused ? '1px solid var(--ink-2)' : '1px solid var(--hairline)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--dim)' }}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
            if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
            if (e.key === 'Enter')     { e.preventDefault(); if (results[active]) select(results[active]); }
            if (e.key === 'Escape')    { setOpen(false); setQ(''); }
          }}
          placeholder="Search any place on Earth..."
          className="flex-1 bg-transparent focus:outline-none"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '14px',
            color: 'var(--ink)',
          }}
        />
        {q && (
          <button
            type="button"
            onClick={() => { setQ(''); setOpen(false); }}
            className="transition-colors"
            style={{ color: 'var(--dim-2)', fontSize: '14px', lineHeight: 1 }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--ink)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--dim-2)')}
            aria-label="Clear"
          >
            ✕
          </button>
        )}
      </div>
      {open && results.length > 0 && (
        <ul
          className="mt-1.5"
          style={{
            background: 'rgba(12, 15, 18, 0.92)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid var(--hairline)',
          }}
        >
          {results.map((p, i) => (
            <li
              key={p.id}
              onClick={() => select(p)}
              onMouseEnter={() => setActive(i)}
              className="px-4 py-2.5 cursor-pointer transition-colors"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '13.5px',
                color: i === active ? 'var(--ink)' : 'var(--ink-2)',
                background: i === active ? 'rgba(0, 200, 5, 0.05)' : 'transparent',
                borderLeft: i === active ? '2px solid var(--signal)' : '2px solid transparent',
                borderBottom: '1px solid var(--hair-2)',
              }}
            >
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
