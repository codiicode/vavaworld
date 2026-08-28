'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { MapRef } from 'react-map-gl/mapbox';
import { searchPlaces, type Place } from '@/lib/geocoding';

/**
 * Parse a free-form coordinate string. Accepts:
 *   "52.52, 13.405"          decimal pair
 *   "52.52 13.405"           space-separated
 *   "-23.55,-46.63"          negatives for south/west
 *   "52.52°N 13.405°E"       with degree symbol + hemisphere
 *   "52.52N, 13.405E"        hemisphere without °
 *
 * Returns null if it doesn't look like coords or is out of range.
 */
function parseCoords(input: string): { lat: number; lng: number } | null {
  const re = /^\s*(-?\d+(?:\.\d+)?)\s*°?\s*([NSns])?\s*[,\s]+\s*(-?\d+(?:\.\d+)?)\s*°?\s*([EWew])?\s*$/;
  const m = input.match(re);
  if (!m) return null;
  let lat = parseFloat(m[1]);
  let lng = parseFloat(m[3]);
  if (m[2]) lat = /[Ss]/.test(m[2]) ? -Math.abs(lat) : Math.abs(lat);
  if (m[4]) lng = /[Ww]/.test(m[4]) ? -Math.abs(lng) : Math.abs(lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

function formatCoord(v: number, pos: 'N' | 'E', neg: 'S' | 'W'): string {
  return `${Math.abs(v).toFixed(4)}°${v >= 0 ? pos : neg}`;
}

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
  // True for the single `q` change that comes from selecting a result. Stops
  // the debounce effect from re-searching the place name and reopening the
  // dropdown right after the user picked an option.
  const justSelectedRef = useRef(false);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }
    if (!q.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    // If the input parses as a coordinate pair, skip the geocoder entirely
    // and surface a synthetic "📍 …°N, …°E" result the user can pick to fly
    // straight there. Useful for sharing precise hex locations.
    const coords = parseCoords(q);
    if (coords) {
      const synthetic: Place = {
        id: `coord:${coords.lat},${coords.lng}`,
        name: `📍 ${formatCoord(coords.lat, 'N', 'S')}, ${formatCoord(coords.lng, 'E', 'W')}`,
        lat: coords.lat,
        lng: coords.lng,
      };
      setResults([synthetic]);
      setOpen(true);
      setActive(0);
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
    justSelectedRef.current = true;
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 14, duration: 1500 });
    setQ(p.name);
    setOpen(false);
    setResults([]);
    inputRef.current?.blur();
  };

  const clear = () => {
    setQ('');
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className="pointer-events-auto relative w-full">
      <div className="glass relative flex h-[52px] items-center gap-3 rounded-full px-[18px]">
        <Search size={18} strokeWidth={2} className="relative z-[1] text-white/55" />
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
          className="relative z-[1] flex-1 bg-transparent text-[14.5px] tracking-[0.01em] text-white placeholder:text-white/55 focus:outline-none"
        />
        {q && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="relative z-[1] grid h-6 w-6 place-items-center rounded-full text-white/55 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
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
                  : 'border-l-transparent text-white/70'
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
