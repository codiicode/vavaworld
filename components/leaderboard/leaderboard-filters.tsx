'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CountrySelect } from '@/components/country-select';

export type SortKey = 'hexes' | 'volume' | 'value' | 'countries' | 'bonded';
/** ISO 3166-1 alpha-2 country code, or 'worldwide' for the all-countries view. */
export type FilterKey = 'worldwide' | string;

const TRIGGER = 'select-trigger';
const CONTENT = 'select-panel';

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
  // Countries / Volume have no per-country equivalent, so they're worldwide-only.
  const isWorldwide = filter === 'worldwide';
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
            <SelectItem value="value">Portfolio Value</SelectItem>
            {isWorldwide && (
              <SelectItem value="volume">Trading Volume (24h)</SelectItem>
            )}
            {isWorldwide && (
              <SelectItem value="countries">Most Countries</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.08em] text-foreground/60">
          Filter By
        </label>
        <CountrySelect
          value={filter}
          onChange={onFilterChange}
          allOption={{ value: 'worldwide', label: 'Worldwide' }}
        />
      </div>
    </div>
  );
}
