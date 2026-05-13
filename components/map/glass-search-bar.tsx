'use client';

import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import type { MapRef } from 'react-map-gl/mapbox';
import { searchPlaces, type Place } from '@/lib/geocoding';

/**
 * Top-of-map glass pill search. Sits in the map column between the left rail
 * and the right panel; pill radius 999, height 52px. Same geocode + flyTo
 * behaviour as the previous SearchBar, restyled to the new design.
 */
export function GlassSearchBar({ mapRef }: { mapRef: React.RefObject<MapRef | null> }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const debounceRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
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

  // Cmd/Ctrl-K focus shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const select = (p: Place) => {
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 14, duration: 1500 });
    setQ(p.name);
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="pointer-events-auto relative w-full">
      <div className="glass relative flex h-[52px] items-center gap-3 rounded-full px-[18px]">
        <Search size={18} strokeWidth={2} className="relative z-[1] text-white/52" />
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, results.length - 1));
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              if (results[active]) select(results[active]);
            }
            if (e.key === 'Escape') {
              setOpen(false);
              setQ('');
              inputRef.current?.blur();
            }
          }}
          placeholder="Search any place on Earth…"
          className="relative z-[1] flex-1 bg-transparent text-[14.5px] tracking-[0.01em] text-white placeholder:text-white/52 focus:outline-none"
        />
        <span
          className="relative z-[1] rounded-md border border-white/15 bg-white/[0.05] px-[7px] py-[3px] text-[11px] text-white/52"
        >
          ⌘K
        </span>
      </div>

      {open && results.length > 0 && (
        <ul className="glass absolute left-0 right-0 top-[60px] z-[2] mt-0 overflow-hidden rounded-[14px]">
          {results.map((p, i) => (
            <li
              key={p.id}
              onClick={() => select(p)}
              onMouseEnter={() => setActive(i)}
              className={`relative z-[1] cursor-pointer border-l-2 px-4 py-2.5 text-[13.5px] transition-colors ${
                i === active
                  ? 'border-l-[var(--brand)] bg-white/[0.06] text-white'
                  : 'border-l-transparent text-white/72'
              }`}
              style={
                i < results.length - 1
                  ? { borderBottom: '1px solid rgba(255,255,255,0.08)' }
                  : undefined
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
