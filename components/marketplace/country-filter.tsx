'use client';

import { useMemo, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { flagEmoji } from '@/lib/flag-emoji';
import { mockCountryCounts } from '@/lib/mock-marketplace';
import { cn } from '@/lib/utils';

/**
 * Country filter — a compact "Add country…" trigger that opens a Command
 * palette of flag + name + count rows. Selected codes appear as removable
 * chips above the trigger.
 *
 * Multi-select: clicking a country toggles it; the popover stays open so
 * collectors can stack a few countries quickly.
 */
export function CountryFilter({
  selected,
  onChange,
}: {
  selected: ReadonlyArray<string>;
  onChange: (next: ReadonlyArray<string>) => void;
}) {
  const [open, setOpen] = useState(false);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (code: string) => {
    if (selectedSet.has(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <div className="flex flex-col">
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs"
            >
              <span>{flagEmoji(code)}</span>
              <span className="uppercase">{code}</span>
              <button
                type="button"
                onClick={() => toggle(code)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${code}`}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="-mx-3 flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="text-muted-foreground">
              {selected.length === 0 ? 'Add country…' : `Add another country…`}
            </span>
            <ChevronDown size={14} className="text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search countries…" className="h-9 text-sm" />
            <CommandList>
              <CommandEmpty>No countries match.</CommandEmpty>
              <CommandGroup>
                {mockCountryCounts.map((c) => {
                  const isSelected = selectedSet.has(c.code);
                  return (
                    <CommandItem
                      key={c.code}
                      value={`${c.code} ${c.name}`}
                      onSelect={() => toggle(c.code)}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-base leading-none">{flagEmoji(c.code)}</span>
                        <span className="text-sm">{c.name}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {c.count.toLocaleString('en-US')}
                        </span>
                        <Check
                          size={12}
                          className={cn('text-primary', isSelected ? 'opacity-100' : 'opacity-0')}
                        />
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
