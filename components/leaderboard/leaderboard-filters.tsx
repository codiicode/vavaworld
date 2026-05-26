'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Flag } from '@/components/flag';
import { COUNTRIES } from '@/lib/countries';

export type SortKey = 'hexes' | 'volume' | 'value' | 'countries' | 'bonded';
/** ISO 3166-1 alpha-2 country code, or 'worldwide' for the all-countries view. */
export type FilterKey = 'worldwide' | string;

// Full ISO list (249 entries) + worldwide sentinel — every country picker on
// the site should read from this so a user is never told "your country doesn't
// exist" just because we forgot to add it.
const COUNTRY_OPTIONS: ReadonlyArray<{ value: FilterKey; label: string }> = [
  { value: 'worldwide', label: 'Worldwide' },
  ...COUNTRIES.map((c) => ({ value: c.code, label: c.name })),
];

const TRIGGER =
  'bg-white/40 backdrop-blur-md border-white/40 h-11 rounded-xl text-foreground';
const CONTENT = 'bg-white/90 backdrop-blur-xl border-white/40';

export function LeaderboardFilters({
  sort,
  onSortChange,
  filter,
  onFilterChange,
}: {
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  filter: FilterKey;
  onFilterChange: (f: FilterKey) => void;
}) {
  return (
    <div className="mb-6 grid max-w-2xl grid-cols-2 gap-4">
      <div>
        <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
          Sort By
        </label>
        <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
          <SelectTrigger className={TRIGGER}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={CONTENT}>
            <SelectItem value="hexes">Most Hexes</SelectItem>
            <SelectItem value="bonded">Most $VAVA Bonded</SelectItem>
            <SelectItem value="volume">Trading Volume (24h)</SelectItem>
            <SelectItem value="value">Portfolio Value</SelectItem>
            <SelectItem value="countries">Most Countries</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
          Filter By
        </label>
        <Select value={filter} onValueChange={(v) => onFilterChange(v as FilterKey)}>
          <SelectTrigger className={TRIGGER}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={CONTENT}>
            {COUNTRY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <span className="flex items-center gap-2">
                  {o.value !== 'worldwide' && <Flag code={o.value} size={14} />}
                  {o.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
