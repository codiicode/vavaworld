import { cn } from '@/lib/utils';
import type { Nation, ActivityKind } from '@/lib/mock-nations';

const DOT: Record<ActivityKind, string> = {
  bond: 'bg-[#7db4f5]',
  presidency: 'bg-white/[0.07]',
  trade: 'bg-slate-400',
  claim: 'bg-slate-400',
};

export function ActivityFeedCard({ nation }: { nation: Nation }) {
  return (
    <div className="rounded-2xl border border-white/40 bg-white/30 p-6 backdrop-blur-md">
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
        Recent activity
      </div>

      <div className="flex flex-col">
        {nation.activity.map((e, i) => (
          <div
            key={e.id}
            className={cn(
              'flex items-start gap-3 py-3',
              i > 0 && 'border-t border-white/25',
            )}
          >
            <span
              className={cn(
                'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
                DOT[e.kind],
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-foreground/80">
                {e.parts.map((part, j) => (
                  <span
                    key={j}
                    className={part.b ? 'font-semibold text-foreground' : undefined}
                  >
                    {part.t}
                  </span>
                ))}
              </p>
              <div className="mt-0.5 text-xs text-foreground/45">{e.ago}</div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="mt-4 text-sm font-medium text-primary transition-colors hover:text-primary/80"
      >
        View all activity
      </button>
    </div>
  );
}
