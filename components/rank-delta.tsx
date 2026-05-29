import { ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Tiny position-change pill: ▲n (green) / ▼n (red) / — (neutral). */
export function RankDelta({ delta, className }: { delta: number; className?: string }) {
  if (delta === 0) {
    return (
      <span
        className={cn('inline-flex items-center text-foreground/35', className)}
        title="No change"
      >
        <Minus size={12} strokeWidth={2.5} />
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums',
        up ? 'text-emerald-600' : 'text-red-500',
        className,
      )}
      title={`${up ? 'Up' : 'Down'} ${Math.abs(delta)} since yesterday`}
    >
      {up ? <ChevronUp size={12} strokeWidth={3} /> : <ChevronDown size={12} strokeWidth={3} />}
      {Math.abs(delta)}
    </span>
  );
}
