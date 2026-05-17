'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type SortKey = 'hexes' | 'volume' | 'value' | 'countries';
export type FilterKey =
  | 'worldwide' | 'se' | 'jp' | 'de' | 'us' | 'kr' | 'gb' | 'fr' | 'it'
  | 'es' | 'br' | 'cn' | 'in' | 'au' | 'ca' | 'nl' | 'pt' | 'no' | 'dk' | 'fi';

const COUNTRY_OPTIONS: ReadonlyArray<{ value: FilterKey; label: string }> = [
  { value: 'worldwide', label: '🌍 Worldwide' },
  { value: 'se', label: '🇸🇪 Sweden' },
  { value: 'jp', label: '🇯🇵 Japan' },
  { value: 'de', label: '🇩🇪 Germany' },
  { value: 'us', label: '🇺🇸 United States' },
  { value: 'kr', label: '🇰🇷 South Korea' },
  { value: 'gb', label: '🇬🇧 United Kingdom' },
  { value: 'fr', label: '🇫🇷 France' },
  { value: 'it', label: '🇮🇹 Italy' },
  { value: 'es', label: '🇪🇸 Spain' },
  { value: 'br', label: '🇧🇷 Brazil' },
  { value: 'cn', label: '🇨🇳 China' },
  { value: 'in', label: '🇮🇳 India' },
  { value: 'au', label: '🇦🇺 Australia' },
  { value: 'ca', label: '🇨🇦 Canada' },
  { value: 'nl', label: '🇳🇱 Netherlands' },
  { value: 'pt', label: '🇵🇹 Portugal' },
  { value: 'no', label: '🇳🇴 Norway' },
  { value: 'dk', label: '🇩🇰 Denmark' },
  { value: 'fi', label: '🇫🇮 Finland' },
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
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
