/**
 * The app's stat tile. Every page showed its own flat variant — a small
 * number in a large empty box — which is what made the app read as a
 * wireframe. One component, one treatment: a quiet label, the figure at
 * real scale, and an optional note underneath.
 */

import { cn } from '@/lib/utils';

export function StatTile({
  label,
  value,
  note,
  accent,
  className,
}: {
  label: string;
  value: string;
  note?: string;
  /** Renders the figure in the brand blue — for the one number that matters. */
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('stat-tile', className)}>
      <span className="stat-k">{label}</span>
      <span className={cn('stat-v', accent && 'accent')}>{value}</span>
      {note && <span className="stat-n">{note}</span>}
    </div>
  );
}
