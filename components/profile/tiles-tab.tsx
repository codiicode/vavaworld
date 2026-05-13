'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Hexagon,
  LayoutGrid,
  List,
  MoreHorizontal,
  RefreshCw,
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
import { TileDetailsDialog } from './tile-details-dialog';
import { TileListDialog } from './tile-list-dialog';
import { TileTransferDialog } from './tile-transfer-dialog';

type DialogKind = 'details' | 'list' | 'transfer';
type DialogState = { kind: DialogKind; tile: ClaimedTile } | null;

const PER_PAGE = 10;

export function TilesTab() {
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [page] = useState(1);

  const { tiles, loading, refetch } = useUserTiles();
  const hexSet = useMemo(() => new Set(tiles?.map((t) => t.h3) ?? []), [tiles]);
  const locations = useHexLocations(hexSet);
  const [dialog, setDialog] = useState<DialogState>(null);
  const openDialog = (kind: DialogKind, tile: ClaimedTile) => setDialog({ kind, tile });
  const dialogLocation = dialog ? locations.get(dialog.tile.h3) ?? null : null;

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
    <div className="glass glass-panel relative overflow-hidden rounded-[22px]">
      <div className="relative z-[1] flex flex-col gap-3 border-b border-white/10 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-white">Your Hexes</h2>
          <p className="text-xs text-white/52 tabular-nums">
            {tiles ? `${tiles.length} ${tiles.length === 1 ? 'hex' : 'hexes'}` : '—'}
            {totalCities > 0 && ` · ${totalCities} ${totalCities === 1 ? 'city' : 'cities'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            disabled={loading}
            className="h-9 gap-1.5 px-3 text-xs text-white/72 hover:bg-white/10 hover:text-white"
            aria-label="Refresh hexes"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/52" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city or country…"
              className="h-9 w-64 rounded-md border-white/15 bg-white/[0.04] pl-8 text-sm text-white placeholder:text-white/40"
            />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="h-9 w-32 border-white/15 bg-white/[0.04] text-white">
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
            className="rounded-md border border-white/15 bg-white/[0.04] p-0.5"
          >
            <ToggleGroupItem
              value="table"
              size="sm"
              aria-label="Table view"
              className="h-8 w-8 text-white/52 data-[state=on]:bg-white/10 data-[state=on]:text-white"
            >
              <List size={14} />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="grid"
              size="sm"
              aria-label="Grid view"
              className="h-8 w-8 text-white/52 data-[state=on]:bg-white/10 data-[state=on]:text-white"
            >
              <LayoutGrid size={14} />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {loading && !tiles && (
        <div className="relative z-[1] px-5 py-12 text-center text-sm text-white/52">Loading hexes…</div>
      )}

      {!loading && tiles?.length === 0 && (
        <div className="relative z-[1] flex flex-col items-center gap-3 px-5 py-16 text-center">
          <Hexagon className="text-white/40" size={28} />
          <p className="text-sm text-white/72">No hexes claimed yet.</p>
          <Link
            href="/map"
            className="inline-flex h-9 items-center rounded-md px-4 text-sm font-bold tracking-[0.02em]"
            style={{
              background: 'linear-gradient(135deg, rgba(94,234,212,0.32), rgba(56,189,248,0.22))',
              border: '1px solid rgba(255,255,255,0.24)',
              color: '#042f2e',
            }}
          >
            Claim your first hex
          </Link>
        </div>
      )}

      {!loading && tiles && tiles.length > 0 && view === 'table' && (
        <div className="relative z-[1]">
          <Table>
            <TableHeader className="[&_tr]:border-white/10 [&_th]:text-white/52">
              <TableRow className="hover:bg-transparent">
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
                  onAction={openDialog}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && tiles && tiles.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageTiles.map((t) => (
            <TileCard key={t.h3} tile={t} location={locations.get(t.h3) ?? null} />
          ))}
        </div>
      )}

      {tiles && tiles.length > 0 && (
        <div className="relative z-[1] flex items-center justify-between border-t border-white/10 px-6 py-3">
          <span className="text-xs tabular-nums text-white/52">
            Showing {start + 1}–{Math.min(start + PER_PAGE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled className="border-white/15 bg-white/[0.04] text-white/52">Previous</Button>
            <Button size="sm" variant="outline" disabled className="border-white/15 bg-white/[0.04] text-white/52">Next</Button>
          </div>
        </div>
      )}

      <TileDetailsDialog
        tile={dialog?.kind === 'details' ? dialog.tile : null}
        location={dialog?.kind === 'details' ? dialogLocation : null}
        open={dialog?.kind === 'details'}
        onOpenChange={(next) => !next && setDialog(null)}
      />
      <TileListDialog
        tile={dialog?.kind === 'list' ? dialog.tile : null}
        location={dialog?.kind === 'list' ? dialogLocation : null}
        open={dialog?.kind === 'list'}
        onOpenChange={(next) => !next && setDialog(null)}
      />
      <TileTransferDialog
        tile={dialog?.kind === 'transfer' ? dialog.tile : null}
        location={dialog?.kind === 'transfer' ? dialogLocation : null}
        open={dialog?.kind === 'transfer'}
        onOpenChange={(next) => !next && setDialog(null)}
      />
    </div>
  );
}

function TileRow({
  tile: t,
  index,
  location: loc,
  onAction,
}: {
  tile: ClaimedTile;
  index: number;
  location: HexLocation | null;
  onAction: (kind: DialogKind, tile: ClaimedTile) => void;
}) {
  const c = hexCenter(t.h3);
  const title = loc?.place ?? loc?.neighborhood ?? loc?.countryName ?? 'Locating…';
  const subtitle = loc
    ? [loc.neighborhood, loc.countryName].filter(Boolean).join(' · ')
    : '—';
  return (
    <TableRow className="h-14 border-white/10 hover:bg-white/[0.04]">
      <TableCell className="tabular-nums text-white/40">
        {String(index).padStart(2, '0')}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none">{flagEmoji(loc?.countryCode) || '🌐'}</span>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-tight text-white">{title}</span>
            <span className="mt-0.5 text-[11px] leading-tight text-white/52">
              {subtitle}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span
          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider"
          style={{ background: 'rgba(94,234,212,0.14)', color: 'var(--brand)' }}
        >
          T{t.tier}
        </span>
      </TableCell>
      <TableCell className="hidden tabular-nums text-white/52 lg:table-cell">
        {new Date(t.claimedAt * 1000).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
      </TableCell>
      <TableCell className="hidden text-[11px] tabular-nums text-white/52 lg:table-cell">
        {Math.abs(c.lat).toFixed(2)}°{c.lat >= 0 ? 'N' : 'S'},{' '}
        {Math.abs(c.lng).toFixed(2)}°{c.lng >= 0 ? 'E' : 'W'}
      </TableCell>
      <TableCell className="text-right">
        <span className="text-sm font-medium tabular-nums text-white">
          {(Number(t.pricePaid) / LAMPORTS_PER_SOL).toFixed(3)}
        </span>
        <span className="ml-1 text-xs text-white/52">SOL</span>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-md p-1.5 text-white/52 hover:bg-white/10 hover:text-white"
              aria-label="Hex actions"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href={`/map#${t.h3}`}>View on map</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction('list', t)}>List for sale</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onAction('transfer', t)}>Transfer</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onAction('details', t)}>Details</DropdownMenuItem>
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
      className="group relative flex flex-col overflow-hidden rounded-[14px] border border-white/10 transition-colors hover:border-white/25"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
      }}
    >
      <div className="relative aspect-[3/2] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 80% at 50% 50%, rgba(94,234,212,0.10), transparent 60%), radial-gradient(60% 60% at 80% 20%, rgba(56,189,248,0.10), transparent 70%)',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Hexagon className="text-[color:var(--brand)] opacity-40" size={56} strokeWidth={1.4} />
        </div>
        <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded border border-white/10 bg-black/40 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
          <span>{flagEmoji(loc?.countryCode) || '🌐'}</span>
          <span className="max-w-[140px] truncate">
            {loc?.place ?? loc?.neighborhood ?? loc?.countryName ?? '—'}
          </span>
        </div>
        <span
          className="absolute right-2 top-2 rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider"
          style={{
            borderColor: 'rgba(94,234,212,0.30)',
            background: 'rgba(94,234,212,0.14)',
            color: 'var(--brand)',
          }}
        >
          T{t.tier}
        </span>
      </div>
      <div className="border-t border-white/10 p-3">
        <div className="truncate text-sm font-medium text-white">
          {loc?.neighborhood ?? loc?.place ?? '—'}
        </div>
        <div className="mt-0.5 text-[11px] tabular-nums text-white/52">
          {Math.abs(c.lat).toFixed(3)}°{c.lat >= 0 ? 'N' : 'S'},{' '}
          {Math.abs(c.lng).toFixed(3)}°{c.lng >= 0 ? 'E' : 'W'}
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-xs text-white/52">Paid</span>
          <span className="text-sm font-medium tabular-nums text-white">
            {(Number(t.pricePaid) / LAMPORTS_PER_SOL).toFixed(3)} SOL
          </span>
        </div>
      </div>
    </Link>
  );
}
