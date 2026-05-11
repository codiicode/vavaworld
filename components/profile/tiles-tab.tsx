'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Hexagon,
  LayoutGrid,
  List,
  MoreHorizontal,
  Search,
} from 'lucide-react';

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
import { mockTiles } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const PER_PAGE = 10;

export function TilesTab() {
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [page] = useState(1);

  const filtered = useMemo(() => {
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
  const pageTiles = filtered.slice(start, start + PER_PAGE);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
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
              placeholder="Search by city or address…"
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
          Showing {start + 1}–{Math.min(start + PER_PAGE, filtered.length)} of {filtered.length}
        </span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="outline" disabled>Previous</Button>
          <Button size="sm" variant="outline" disabled>Next</Button>
        </div>
      </div>
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
          <span className="text-sm font-medium tabular-nums">{t.floor.toFixed(2)} SOL</span>
        </div>
      </div>
    </Link>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
}
