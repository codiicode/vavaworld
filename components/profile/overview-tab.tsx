'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Coins, Hexagon, Shield, TrendingUp } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { mockActivity, mockPortfolioHistory } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const ACTIVITY_ICONS = {
  claim: { Icon: Hexagon, className: 'bg-primary/10 text-primary' },
  sale: { Icon: ArrowRight, className: 'bg-emerald-500/10 text-emerald-600' },
  yield: { Icon: Coins, className: 'bg-amber-500/10 text-amber-600' },
  decay: { Icon: Shield, className: 'bg-blue-500/10 text-blue-600' },
} as const;

export function OverviewTab({ onSeeAllActivity }: { onSeeAllActivity: () => void }) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const chartData = useMemo(() => {
    const n = period === '7d' ? 7 : period === '30d' ? 30 : 30;
    return mockPortfolioHistory.slice(-n);
  }, [period]);

  const latest = chartData[chartData.length - 1]?.value ?? 0;
  const first = chartData[0]?.value ?? 0;
  const delta = latest - first;
  const pct = first ? (delta / first) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total Tiles" value="47" delta="+3 this month" icon={Hexagon} />
        <Kpi label="Total Value" value="12.84" unit="SOL" delta="+15.2% YTD" icon={TrendingUp} />
        <Kpi label="$VAVA Balance" value="284,710" delta="200K staked" icon={Coins} />
        <Kpi
          label="Decay Alerts"
          value="2"
          delta="Renew soon"
          deltaColor="warning"
          icon={AlertCircle}
        />
      </div>

      {/* Chart + recent activity preview */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Chart spans 2 cols */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-[15px] font-semibold tracking-tight">Portfolio Value</h3>
            <ToggleGroup
              type="single"
              value={period}
              onValueChange={(v) => v && setPeriod(v as typeof period)}
            >
              {(['7d', '30d', '90d', 'all'] as const).map((p) => (
                <ToggleGroupItem key={p} value={p} size="sm" className="text-xs uppercase">
                  {p}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          <div className="h-[220px] px-2 pt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="vavaArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7CBFEC" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#7CBFEC" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={(v: string) => v.slice(5)}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  width={32}
                />
                <RTooltip
                  contentStyle={{
                    background: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  formatter={(v) => [`${Number(v).toFixed(2)} SOL`, '']}
                />
                <Area type="monotone" dataKey="value" stroke="#7CBFEC" strokeWidth={2} fill="url(#vavaArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-px border-t border-border bg-border">
            <ChartStat label="Current" value={`${latest.toFixed(2)} SOL`} />
            <ChartStat
              label="Change"
              value={`${delta >= 0 ? '+' : ''}${delta.toFixed(2)} SOL`}
              tone={delta >= 0 ? 'pos' : 'neg'}
            />
            <ChartStat
              label="Percent"
              value={`${pct >= 0 ? '+' : ''}${pct.toFixed(0)}%`}
              tone={pct >= 0 ? 'pos' : 'neg'}
            />
          </div>
        </div>

        {/* Recent activity (top 4) */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-[15px] font-semibold tracking-tight">Recent</h3>
            <button
              type="button"
              onClick={onSeeAllActivity}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </button>
          </div>
          <div className="flex flex-col px-4 py-2">
            {mockActivity.slice(0, 4).map((a) => {
              const { Icon, className } = ACTIVITY_ICONS[a.type];
              return (
                <div
                  key={a.id}
                  className="-mx-1 flex cursor-pointer items-start gap-3 rounded-md px-1 py-2.5 transition-colors hover:bg-muted/30"
                >
                  <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', className)}>
                    <Icon size={12} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm">{a.description}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {a.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  unit,
  delta,
  deltaColor = 'positive',
  icon: Icon,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaColor?: 'positive' | 'warning';
  icon: typeof Hexagon;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        <Icon size={14} className="text-muted-foreground" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">{value}</span>
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
      {delta && (
        <div
          className={cn(
            'mt-2 text-[11px] font-medium',
            deltaColor === 'warning' ? 'text-orange-600' : 'text-emerald-600',
          )}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

function ChartStat({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'neg' }) {
  return (
    <div className="bg-card px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          'mt-1 text-sm font-semibold tabular-nums',
          tone === 'pos' && 'text-emerald-600',
          tone === 'neg' && 'text-red-600',
        )}
      >
        {value}
      </div>
    </div>
  );
}
