'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { mockTierCounts, type Tier } from '@/lib/mock-marketplace';
import { CountryFilter } from './country-filter';

export type StatusValue = 'listed' | 'auction' | 'reserve-met';

export type FilterState = {
  search: string;
  tiers: ReadonlyArray<Tier>;
  priceMin: number;
  priceMax: number;
  countries: ReadonlyArray<string>;
  decayMin: number;
  status: StatusValue;
  iconic: boolean;
  newOnly: boolean;
  whaleOnly: boolean;
};

export const defaultFilterState: FilterState = {
  search: '',
  tiers: [],
  priceMin: 0,
  priceMax: 10,
  countries: [],
  decayMin: 0,
  status: 'listed',
  iconic: false,
  newOnly: false,
  whaleOnly: false,
};

const TIERS: ReadonlyArray<{ id: Tier; label: string }> = [
  { id: 1, label: 'Tier 1' },
  { id: 2, label: 'Tier 2' },
  { id: 3, label: 'Tier 3' },
];

const STATUSES: ReadonlyArray<{ id: StatusValue; label: string }> = [
  { id: 'listed', label: 'Listed for sale' },
  { id: 'auction', label: 'Auction live' },
  { id: 'reserve-met', label: 'Reserve met' },
];

/**
 * Sticky 240px filter rail on the left of the marketplace.
 *
 * Built for power users — every filter visible at a glance, no nested
 * accordions, no "filter button" that opens a modal. Counts shown next to
 * each option so you know how many results you'd get before clicking.
 */
export function FilterSidebar({
  state,
  onChange,
}: {
  state: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const set = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onChange({ ...state, [key]: value });

  const toggleTier = (tier: Tier) => {
    const has = state.tiers.includes(tier);
    set('tiers', has ? state.tiers.filter((t) => t !== tier) : [...state.tiers, tier]);
  };

  const reset = () => onChange(defaultFilterState);

  return (
    <aside className="flex h-full w-60 flex-shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-white/[0.02] text-white backdrop-blur-md">
      {/* Search */}
      <div className="border-b border-white/10 p-4">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/52" />
          <Input
            value={state.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Search hexes…"
            className="h-9 pl-8 text-sm"
          />
        </div>
      </div>

      {/* Tier */}
      <FilterGroup label="Tier">
        <div className="flex flex-col gap-2.5">
          {TIERS.map((t) => (
            <div key={t.id} className="flex items-center justify-between text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={state.tiers.includes(t.id)}
                  onCheckedChange={() => toggleTier(t.id)}
                />
                <span className="font-medium">{t.label}</span>
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
                  T{t.id}
                </span>
              </label>
              <span className="text-xs tabular-nums text-white/52">
                {mockTierCounts[t.id].toLocaleString('en-US')}
              </span>
            </div>
          ))}
        </div>
      </FilterGroup>

      {/* Price */}
      <FilterGroup label="Price">
        <Slider
          value={[state.priceMin, state.priceMax]}
          onValueChange={([min, max]) => onChange({ ...state, priceMin: min, priceMax: max })}
          min={0}
          max={10}
          step={0.001}
          className="my-3"
        />
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={state.priceMin || ''}
            onChange={(e) => set('priceMin', Number(e.target.value) || 0)}
            placeholder="Min"
            className="h-8 text-xs tabular-nums"
            inputMode="decimal"
          />
          <span className="text-xs text-white/52">—</span>
          <Input
            value={state.priceMax || ''}
            onChange={(e) => set('priceMax', Number(e.target.value) || 0)}
            placeholder="Max"
            className="h-8 text-xs tabular-nums"
            inputMode="decimal"
          />
          <span className="text-xs text-white/52">SOL</span>
        </div>
      </FilterGroup>

      {/* Country */}
      <FilterGroup label="Country">
        <CountryFilter
          selected={state.countries}
          onChange={(next) => set('countries', next)}
        />
      </FilterGroup>

      {/* Decay */}
      <FilterGroup label="Decay">
        <Slider
          value={[state.decayMin]}
          onValueChange={([v]) => set('decayMin', v)}
          min={0}
          max={100}
          step={1}
        />
        <div className="mt-2 text-xs text-white/52">
          Show hexes with{' '}
          <span className="tabular-nums text-foreground">{state.decayMin}%</span>+ remaining
        </div>
      </FilterGroup>

      {/* Status */}
      <FilterGroup label="Status">
        <div className="flex flex-col gap-2.5">
          {STATUSES.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="status"
                checked={state.status === s.id}
                onChange={() => set('status', s.id)}
                className="h-3.5 w-3.5 accent-primary"
              />
              <span>{s.label}</span>
            </label>
          ))}
        </div>
      </FilterGroup>

      {/* Special */}
      <FilterGroup label="Special">
        <div className="flex flex-col gap-2.5">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={state.iconic}
              onCheckedChange={(v) => set('iconic', v === true)}
            />
            <span>Iconic locations</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={state.newOnly}
              onCheckedChange={(v) => set('newOnly', v === true)}
            />
            <span>New listings (24h)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={state.whaleOnly}
              onCheckedChange={(v) => set('whaleOnly', v === true)}
            />
            <span>Owned by whales</span>
          </label>
        </div>
      </FilterGroup>

      <div className="p-4">
        <Button variant="ghost" size="sm" className="w-full" onClick={reset}>
          Reset filters
        </Button>
      </div>
    </aside>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/10 p-4">
      <div className="mb-3 text-[10px] font-medium uppercase tracking-[0.08em] text-white/52">
        {label}
      </div>
      {children}
    </div>
  );
}
