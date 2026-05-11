'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Coins,
  Hexagon,
  LayoutGrid,
  List,
  MoreHorizontal,
  Search,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from 'recharts';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { flagEmoji } from '@/lib/flag-emoji';
import { mockActivity, mockPortfolioHistory, mockTiles } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const PER_PAGE = 10;

const ACTIVITY_ICONS = {
  claim: { Icon: Hexagon, className: 'bg-primary/10 text-primary' },
  sale: { Icon: ArrowRight, className: 'bg-emerald-500/10 text-emerald-600' },
  yield: { Icon: Coins, className: 'bg-amber-500/10 text-amber-600' },
  decay: { Icon: Shield, className: 'bg-blue-500/10 text-blue-600' },
} as const;

export default function PortfolioPage() {
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [page] = useState(1);

  const filteredTiles = useMemo(() => {
    return mockTiles.filter((t) => {
      if (tierFilter !== 'all' && String(t.tier) !== tierFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.city.toLowerCase().includes(q) && !t.neighborhood.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [search, tierFilter]);

  const start = (page - 1) * PER_PAGE;
  const pageTiles = filteredTiles.slice(start, start + PER_PAGE);

  const chartData = useMemo(() => {
    const n = chartPeriod === '7d' ? 7 : chartPeriod === '30d' ? 30 : chartPeriod === '90d' ? 30 : 30;
    return mockPortfolioHistory.slice(-n);
  }, [chartPeriod]);

  const chartLatest = chartData[chartData.length - 1]?.value ?? 0;
  const chartFirst = chartData[0]?.value ?? 0;
  const chartDelta = chartLatest - chartFirst;
  const chartPct = chartFirst ? (chartDelta / chartFirst) * 100 : 0;

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-8">
      {/* Hero */}
      <div className="mb-8">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Portfolio
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">My Tiles</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your hexagonal holdings across the world
        </p>
      </div>

      {/* KPI grid */}
      <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total Tiles" value="47" delta="+3 this month" icon={Hexagon} />
        <Kpi label="Total Value" value="12.84" unit="SOL" delta="+15.2% YTD" icon={TrendingUp} />
        <Kpi label="$VAVA Balance" value="284,710" delta="200K staked" icon={Coins} />
        <Kpi label="Decay Alerts" value="2" delta="Renew soon" deltaColor="warning" icon={AlertCircle} />
      </div>

      {/* Tiles section */}
      <div className="mb-10 overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight">Your Tiles</h2>
            <p className="text-xs text-muted-foreground">
              {mockTiles.length} tiles · {new Set(mockTiles.map((t) => t.city)).size} cities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by city or address..."
                className="h-9 w-64 rounded-md pl-8 text-sm"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="h-9 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="1">Tier 1</SelectItem>
                <SelectItem value="2">Tier 2</SelectItem>
                <SelectItem value="3">Tier 3</SelectItem>
              </SelectContent>
            </Select>
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v as 'table' | 'grid')}
            >
              <ToggleGroupItem value="table" size="sm" aria-label="Table view">
                <List size={14} />
              </ToggleGroupItem>
              <ToggleGroupItem value="grid" size="sm" aria-label="Grid view">
                <LayoutGrid size={14} />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {view === 'table' ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[80px]">Tier</TableHead>
                <TableHead className="hidden w-[110px] lg:table-cell">Claimed</TableHead>
                <TableHead className="hidden w-[140px] lg:table-cell">Decay</TableHead>
                <TableHead className="w-[110px] text-right">Floor</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageTiles.map((t) => (
                <TableRow key={t.id} className="h-14 cursor-pointer">
                  <TableCell className="tabular-nums text-muted-foreground">{t.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="text-base leading-none">{flagEmoji(t.country) || '🌐'}</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium leading-tight">{t.city}</span>
                        <span className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                          {t.neighborhood}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
                      T{t.tier}
                    </span>
                  </TableCell>
                  <TableCell className="hidden tabular-nums text-muted-foreground lg:table-cell">
                    {formatDate(t.claimedAt)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <DecayBar percent={t.decayPercent} />
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-sm font-medium tabular-nums">{t.floor.toFixed(2)}</span>
                    <span className="ml-1 text-xs text-muted-foreground">SOL</span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label="Tile actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link href="/map">View on map</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>List for sale</DropdownMenuItem>
                        <DropdownMenuItem disabled>Transfer</DropdownMenuItem>
                        <DropdownMenuItem disabled>Rename</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled>Details</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pageTiles.map((t) => (
              <TileCard key={t.id} tile={t} />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-xs tabular-nums text-muted-foreground">
            Showing {start + 1}–{Math.min(start + PER_PAGE, filteredTiles.length)} of {filteredTiles.length}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled>Previous</Button>
            <Button size="sm" variant="outline" disabled>Next</Button>
          </div>
        </div>
      </div>

      {/* Bottom: chart + activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Portfolio chart */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-[15px] font-semibold tracking-tight">Portfolio Value</h3>
            <ToggleGroup
              type="single"
              value={chartPeriod}
              onValueChange={(v) => v && setChartPeriod(v as typeof chartPeriod)}
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
            <ChartStat label="Current" value={`${chartLatest.toFixed(2)} SOL`} />
            <ChartStat
              label="Change"
              value={`${chartDelta >= 0 ? '+' : ''}${chartDelta.toFixed(2)} SOL`}
              tone={chartDelta >= 0 ? 'pos' : 'neg'}
            />
            <ChartStat
              label="Percent"
              value={`${chartPct >= 0 ? '+' : ''}${chartPct.toFixed(0)}%`}
              tone={chartPct >= 0 ? 'pos' : 'neg'}
            />
          </div>
        </div>

        {/* Activity feed */}
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h3 className="text-[15px] font-semibold tracking-tight">Recent Activity</h3>
            <Link href="#" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="flex flex-col px-4 py-2">
            {mockActivity.map((a) => {
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
                    {a.detail && (
                      <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                        {a.detail}
                      </div>
                    )}
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

function DecayBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            percent > 70 ? 'bg-emerald-500' : percent > 30 ? 'bg-amber-500' : 'bg-red-500',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="w-8 text-xs tabular-nums text-muted-foreground">{percent}%</span>
    </div>
  );
}

function TileCard({ tile: t }: { tile: (typeof mockTiles)[number] }) {
  return (
    <Link
      href="/map"
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-background transition-colors hover:border-primary/30"
    >
      {/* Preview area — SVG hex placeholder for now (TODO: Mapbox Static API) */}
      <div className="relative aspect-[3/2] bg-muted">
        <div className="absolute inset-0 flex items-center justify-center">
          <Hexagon className="text-primary/40" size={48} />
        </div>
        <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-background/80 px-2 py-1 text-[11px] font-medium backdrop-blur-sm">
          <span>{flagEmoji(t.country) || '🌐'}</span>
          <span>{t.city}</span>
        </div>
        <span className="absolute right-2 top-2 rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
          T{t.tier}
        </span>
      </div>
      <div className="p-3">
        <div className="truncate text-sm font-medium">{t.neighborhood}</div>
        <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
          {Math.abs(t.lat).toFixed(3)}°{t.lat >= 0 ? 'N' : 'S'},{' '}
          {Math.abs(t.lng).toFixed(3)}°{t.lng >= 0 ? 'E' : 'W'}
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Floor</span>
          <span className="text-sm font-medium tabular-nums">
            {t.floor.toFixed(2)} SOL
          </span>
        </div>
      </div>
    </Link>
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}
