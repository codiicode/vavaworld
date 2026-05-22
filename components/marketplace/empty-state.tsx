'use client';

import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Shown when the active filter combo returns zero rows. Designed to be calm,
 * not alarmist — most cases are "user picked a too-narrow country + tier
 * combo" and just need a hint to widen.
 */
export function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <SearchX className="text-muted-foreground" size={28} />
      <p className="text-sm font-medium">No listings match your filters</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Try widening the price range or dropping a country.
      </p>
      <Button variant="outline" size="sm" onClick={onReset} className="mt-1">
        Reset filters
      </Button>
    </div>
  );
}
