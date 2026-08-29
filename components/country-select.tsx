'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Flag } from '@/components/flag';
import { cn } from '@/lib/utils';
import { COUNTRIES, findCountry } from '@/lib/countries';

export type CountrySelectAllOption = { value: string; label: string };

/**
 * Single searchable + scrollable country picker used everywhere a country
 * dropdown appears (leaderboard filter, marketplace filter, profile flag).
 * `allOption` adds a pinned sentinel row (e.g. Worldwide / All countries);
 * `clearable` adds an inline clear button for optional pickers.
 */
export function CountrySelect({
  value,
  onChange,
  allOption,
  clearable = false,
  placeholder = 'Select country',
  triggerClassName,
  contentClassName,
  align = 'start',
}: {
  value: string;
  onChange: (next: string) => void;
  allOption?: CountrySelectAllOption;
  clearable?: boolean;
  placeholder?: string;
  triggerClassName?: string;
  contentClassName?: string;
  align?: 'start' | 'center' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const isAll = !!allOption && value === allOption.value;
  const selected = isAll ? null : findCountry(value);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.includes(q),
    );
  }, [q]);
  const showAll = !!allOption && (!q || allOption.label.toLowerCase().includes(q));

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch('');
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-white/40 bg-white/40 px-3 text-left text-sm text-foreground backdrop-blur-md transition-colors hover:bg-white/50 dark:border-white/15 dark:bg-white/10 dark:hover:bg-white/15',
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {selected ? (
              <>
                <Flag code={selected.code} size={15} />
                <span className="truncate">{selected.name}</span>
              </>
            ) : isAll ? (
              <span className="truncate">{allOption!.label}</span>
            ) : (
              <span className="truncate text-foreground/50">{placeholder}</span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {clearable && selected && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange('');
                  }
                }}
                className="rounded p-0.5 text-foreground/50 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
                aria-label="Clear country"
              >
                <X size={12} />
              </span>
            )}
            <ChevronsUpDown size={14} className="opacity-50" />
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className={cn(
          'w-[--radix-popover-trigger-width] border-white/40 bg-white/90 p-0 backdrop-blur-xl dark:border-white/15 dark:bg-slate-900/95',
          contentClassName,
        )}
        align={align}
      >
        <div className="flex items-center gap-2 border-b border-black/10 px-3 dark:border-white/10">
          <Search size={14} className="text-foreground/40" />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search countries…"
            className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/40"
          />
        </div>
        <div className="max-h-72 overflow-y-auto overscroll-contain p-1">
          {showAll && (
            <Row
              flag={null}
              label={allOption!.label}
              selected={isAll}
              onSelect={() => {
                onChange(allOption!.value);
                setOpen(false);
              }}
            />
          )}
          {filtered.length === 0 && !showAll && (
            <p className="px-3 py-6 text-center text-xs text-foreground/50">
              No countries match.
            </p>
          )}
          {filtered.map((c) => (
            <Row
              key={c.code}
              flag={c.code}
              label={c.name}
              selected={c.code === value}
              onSelect={() => {
                onChange(c.code);
                setOpen(false);
              }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Row({
  flag,
  label,
  selected,
  onSelect,
}: {
  flag: string | null;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-black/5',
        selected && 'bg-black/5',
      )}
    >
      <span className="flex items-center gap-2">
        {flag && <Flag code={flag} size={15} />}
        <span>{label}</span>
      </span>
      {selected && <Check size={12} className="text-primary" />}
    </button>
  );
}
