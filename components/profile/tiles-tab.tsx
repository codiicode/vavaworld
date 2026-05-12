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
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

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
import { hexCenter } from '@/lib/h3-utils';
import { useUserTiles } from '@/lib/use-user-tiles';
import { useHexLocations, type HexLocation } from '@/lib/use-hex-locations';
import type { ClaimedTile } from '@/types/tile';

const PER_PAGE = 10;

export function TilesTab() {
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [page] = useState(1);

  const { tiles, loading } = useUserTiles();
  const hexSet = useMemo(() => new Set(tiles?.map((t) => t.h3) ?? []), [tiles]);
  const locations = useHexLocations(hexSet);

  const filtered = useMemo(() => {
    if (!tiles) return [];
    return tiles.filter((t) => {
      if (tierFilter !== 'all' && String(t.tier) !== tierFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const loc = locations.get(t.h3);
        const haystack = [loc?.place, loc?.neighborhood, loc?.countryName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [tiles, search, tierFilter, locations]);

  const start = (page - 1) * PER_PAGE;
  const pageTiles = filtered.slice(start, start + PER_PAGE);
  const totalCities = useMemo(() => {
    const s = new Set<string>();
    tiles?.forEach((t) => {
      const loc = locations.get(t.h3);
      if (loc?.place) s.add(loc.place);
    });
    return s.size;
  }, [tiles, locations]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">Your Tiles</h2>
          <p className="text-xs text-muted-foreground tabular-nums">
            {tiles ? `${tiles.length} ${tiles.length === 1 ? 'tile' : 'tiles'}` : '—'}
            {totalCities > 0 && ` · ${totalCities} ${totalCities === 1 ? 'city' : 'cities'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city or country…"
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

      {loading && !tiles && (
        <div className="px-5 py-12 text-center text-sm text-muted-foreground">Loading tiles…</div>
      )}

      {!loading && tiles?.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
          <Hexagon className="text-muted-foreground" size={28} />
          <p className="text-sm text-muted-foreground">No tiles claimed yet.</p>
          <Link
            href="/map"
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Claim your first tile
          </Link>
        </div>
      )}

      {!loading && tiles && tiles.length > 0 && view === 'table' && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-[80px]">Tier</TableHead>
              <TableHead className="hidden w-[110px] lg:table-cell">Claimed</TableHead>
              <TableHead className="hidden w-[140px] lg:table-cell">Coordinates</TableHead>
              <TableHead className="w-[110px] text-right">Paid</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageTiles.map((t, i) => (
              <TileRow
                key={t.h3}
                tile={t}
                index={start + i + 1}
                location={locations.get(t.h3) ?? null}
              />
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && tiles && tiles.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageTiles.map((t) => (
            <TileCard key={t.h3} tile={t} location={locations.get(t.h3) ?? null} />
          ))}
        </div>
      )}

      {tiles && tiles.length > 0 && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-xs tabular-nums text-muted-foreground">
            Showing {start + 1}–{Math.min(start + PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled>Previous</Button>
            <Button size="sm" variant="outline" disabled>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TileRow({
  tile: t,
  index,
  location: loc,
}: {
  tile: ClaimedTile;
  index: number;
  location: HexLocation | null;
}) {
  const c = hexCenter(t.h3);
  const title = loc?.place ?? loc?.neighborhood ?? loc?.countryName ?? 'Locating…';
  const subtitle = loc
    ? [loc.neighborhood, loc.countryName].filter(Boolean).join(' · ')
    : '—';
  return (
    <TableRow className="h-14">
      <TableCell className="tabular-nums text-muted-foreground">
        {String(index).padStart(2, '0')}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none">{flagEmoji(loc?.countryCode) || '🌐'}</span>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-tight">{title}</span>
            <span className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
              {subtitle}
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
        {new Date(t.claimedAt * 1000).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
      </TableCell>
      <TableCell className="hidden text-[11px] tabular-nums text-muted-foreground lg:table-cell">
        {Math.abs(c.lat).toFixed(2)}°{c.lat >= 0 ? 'N' : 'S'},{' '}
        {Math.abs(c.lng).toFixed(2)}°{c.lng >= 0 ? 'E' : 'W'}
      </TableCell>
      <TableCell className="text-right">
        <span className="text-sm font-medium tabular-nums">
          {(Number(t.pricePaid) / LAMPORTS_PER_SOL).toFixed(3)}
        </span>
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
              <Link href={`/map#${t.h3}`}>View on map</Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>List for sale</DropdownMenuItem>
            <DropdownMenuItem disabled>Transfer</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>Details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function TileCard({ tile: t, location: loc }: { tile: ClaimedTile; location: HexLocation | null }) {
  const c = hexCenter(t.h3);
  return (
    <Link
      href={`/map#${t.h3}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-background transition-colors hover:border-primary/30"
    >
      <div className="relative aspect-[3/2] bg-muted">
        <div className="absolute inset-0 flex items-center justify-center">
          <Hexagon className="text-primary/40" size={48} />
        </div>
        <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded bg-background/80 px-2 py-1 text-[11px] font-medium backdrop-blur-sm">
          <span>{flagEmoji(loc?.countryCode) || '🌐'}</span>
          <span className="truncate max-w-[140px]">
            {loc?.place ?? loc?.neighborhood ?? loc?.countryName ?? '—'}
          </span>
        </div>
        <span className="absolute right-2 top-2 rounded border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
          T{t.tier}
        </span>
      </div>
      <div className="p-3">
        <div className="truncate text-sm font-medium">
          {loc?.neighborhood ?? loc?.place ?? '—'}
        </div>
        <div className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
          {Math.abs(c.lat).toFixed(3)}°{c.lat >= 0 ? 'N' : 'S'},{' '}
          {Math.abs(c.lng).toFixed(3)}°{c.lng >= 0 ? 'E' : 'W'}
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Paid</span>
          <span className="text-sm font-medium tabular-nums">
            {(Number(t.pricePaid) / LAMPORTS_PER_SOL).toFixed(3)} SOL
          </span>
        </div>
      </div>
    </Link>
  );
}
