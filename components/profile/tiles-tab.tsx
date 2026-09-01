'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Hexagon,
  LayoutGrid,
  Layers,
  List,
  MoreHorizontal,
  RefreshCw,
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
import { Flag } from '@/components/flag';
import { hexStaticMapUrl } from '@/lib/static-map';
import { groupTilesByClaim, type TileGroup } from '@/lib/tile-groups';
import { useUserTiles } from '@/lib/use-user-tiles';
import { useHexLocations } from '@/lib/use-hex-locations';
import type { ClaimedTile } from '@/types/tile';
import { TileDetailsDialog } from './tile-details-dialog';
import { TileListDialog } from './tile-list-dialog';
import { TileTransferDialog } from './tile-transfer-dialog';

type DialogKind = 'details' | 'list' | 'transfer';
type DialogState = { kind: DialogKind; tile: ClaimedTile } | null;

const PER_PAGE = 10;

export function TilesTab() {
  const [view, setView] = useState<'table' | 'grid'>('grid');
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [page] = useState(1);

  const { tiles, loading, refetch } = useUserTiles();
  const hexSet = useMemo(() => new Set(tiles?.map((t) => t.h3) ?? []), [tiles]);
  const locations = useHexLocations(hexSet);
  const [dialog, setDialog] = useState<DialogState>(null);
  const openDialog = (kind: DialogKind, tile: ClaimedTile) => setDialog({ kind, tile });
  const dialogLocation = dialog ? locations.get(dialog.tile.h3) ?? null : null;

  const filteredTiles = useMemo(() => {
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

  // Group hexes by claim transaction - 50 hexes bought in one tx render as one
  // "property" card / row, not 50 copies of the same purchase.
  const groups = useMemo(
    () => groupTilesByClaim(filteredTiles, locations),
    [filteredTiles, locations],
  );

  const start = (page - 1) * PER_PAGE;
  const pageGroups = groups.slice(start, start + PER_PAGE);
  const totalCities = useMemo(() => {
    const s = new Set<string>();
    tiles?.forEach((t) => {
      const loc = locations.get(t.h3);
      if (loc?.place) s.add(loc.place);
    });
    return s.size;
  }, [tiles, locations]);
  const totalProperties = groups.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md">
      <div className="flex flex-col gap-3 border-b border-foreground/10 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-foreground">Your Hexes</h2>
          <p className="text-xs text-foreground/55 tabular-nums">
            {tiles
              ? `${tiles.length} ${tiles.length === 1 ? 'hex' : 'hexes'} · ${totalProperties} ${totalProperties === 1 ? 'property' : 'properties'}`
              : '-'}
            {totalCities > 0 && ` · ${totalCities} ${totalCities === 1 ? 'city' : 'cities'}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refetch}
            disabled={loading}
            className="h-9 gap-1.5 px-3 text-xs text-foreground/65 hover:bg-foreground/[0.05] hover:text-foreground"
            aria-label="Refresh hexes"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city or country…"
              className="h-9 w-64 rounded-md border-foreground/10 bg-white/60 pl-8 text-sm text-foreground placeholder:text-foreground/45"
            />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="h-9 w-32 border-foreground/10 bg-white/60 text-foreground">
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
            className="rounded-md border border-foreground/10 bg-white/60 p-0.5"
          >
            <ToggleGroupItem
              value="table"
              size="sm"
              aria-label="Table view"
              className="h-8 w-8 text-foreground/55 data-[state=on]:bg-foreground/10 data-[state=on]:text-foreground"
            >
              <List size={14} />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="grid"
              size="sm"
              aria-label="Grid view"
              className="h-8 w-8 text-foreground/55 data-[state=on]:bg-foreground/10 data-[state=on]:text-foreground"
            >
              <LayoutGrid size={14} />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {loading && !tiles && (
        <div className="px-5 py-12 text-center text-sm text-foreground/55">Loading hexes…</div>
      )}

      {!loading && tiles?.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-5 py-20 text-center">
          <Hexagon className="text-foreground/35" size={32} strokeWidth={1.6} />
          <p className="text-sm text-foreground/65">No hexes claimed yet.</p>
          <Link
            href="/map"
            className="mt-1 inline-flex h-10 items-center rounded-[10px] px-5 text-sm font-semibold tracking-[0.01em] transition-transform hover:-translate-y-px"
            style={{
              background: '#ffffff',
              color: '#06080d',
              boxShadow: '0 10px 26px -12px rgba(0,0,0,0.9)',
            }}
          >
            Claim your first hex
          </Link>
        </div>
      )}

      {!loading && tiles && tiles.length > 0 && view === 'table' && (
        <div>
          <Table>
            <TableHeader className="[&_tr]:border-foreground/10 [&_th]:text-foreground/55">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Property</TableHead>
                <TableHead className="w-[80px]">Tier</TableHead>
                <TableHead className="hidden w-[110px] lg:table-cell">Claimed</TableHead>
                <TableHead className="hidden w-[140px] lg:table-cell">Coordinates</TableHead>
                <TableHead className="w-[110px] text-right">Paid</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageGroups.map((g, i) => (
                <GroupRow
                  key={g.key}
                  group={g}
                  index={start + i + 1}
                  onAction={openDialog}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && tiles && tiles.length > 0 && view === 'grid' && (
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageGroups.map((g) => (
            <GroupCard key={g.key} group={g} onAction={openDialog} />
          ))}
        </div>
      )}

      {tiles && tiles.length > 0 && (
        <div className="flex items-center justify-between border-t border-foreground/10 px-6 py-3">
          <span className="text-xs tabular-nums text-foreground/55">
            Showing {start + 1}-{Math.min(start + PER_PAGE, groups.length)} of {groups.length}
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" disabled className="border-foreground/15 bg-white/40 text-foreground/55">Previous</Button>
            <Button size="sm" variant="outline" disabled className="border-foreground/15 bg-white/40 text-foreground/55">Next</Button>
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

function GroupRow({
  group: g,
  index,
  onAction,
}: {
  group: TileGroup;
  index: number;
  onAction: (kind: DialogKind, tile: ClaimedTile) => void;
}) {
  const isSingle = g.tiles.length === 1;
  const title = isSingle
    ? g.neighborhood ?? g.citiesLabel ?? g.countryName ?? 'Locating…'
    : g.citiesLabel;
  const subtitle = isSingle
    ? [g.citiesLabel, g.countryName].filter(Boolean).join(' · ')
    : `${g.tiles.length} hexes${g.countryName ? ` · ${g.countryName}` : ''}`;
  const firstTile = g.tiles[0];
  return (
    <TableRow className="h-14 border-foreground/10 hover:bg-foreground/[0.03]">
      <TableCell className="tabular-nums text-foreground/40">
        {String(index).padStart(2, '0')}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <Flag code={g.countryCode} size={15} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium leading-tight text-foreground">
              {title}
            </span>
            <span className="mt-0.5 truncate text-[11px] leading-tight text-foreground/55">
              {subtitle}
            </span>
          </div>
          {!isSingle && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
              <Layers size={10} />
              {g.tiles.length}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className="rounded bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
          T{g.representativeTier}
        </span>
      </TableCell>
      <TableCell className="hidden tabular-nums text-foreground/55 lg:table-cell">
        {new Date(g.claimedAt * 1000).toLocaleDateString('en-US', { month: 'short', day: '2-digit' })}
      </TableCell>
      <TableCell className="hidden text-[11px] tabular-nums text-foreground/55 lg:table-cell">
        {Math.abs(g.centerLat).toFixed(2)}°{g.centerLat >= 0 ? 'N' : 'S'},{' '}
        {Math.abs(g.centerLng).toFixed(2)}°{g.centerLng >= 0 ? 'E' : 'W'}
      </TableCell>
      <TableCell className="text-right">
        <span className="text-sm font-medium tabular-nums text-foreground">
          {g.totalSol.toFixed(3)}
        </span>
        <span className="ml-1 text-xs text-foreground/55">SOL</span>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="rounded-md p-1.5 text-foreground/55 hover:bg-foreground/[0.06] hover:text-foreground"
              aria-label="Property actions"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal size={14} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem asChild>
              <Link href={`/map#${firstTile.h3}`}>View on map</Link>
            </DropdownMenuItem>
            {isSingle && (
              <>
                <DropdownMenuItem onSelect={() => onAction('list', firstTile)}>
                  List for sale
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAction('transfer', firstTile)}>
                  Transfer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onAction('details', firstTile)}>
                  Details
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function GroupCard({
  group: g,
  onAction,
}: {
  group: TileGroup;
  onAction: (kind: DialogKind, tile: ClaimedTile) => void;
}) {
  const router = useRouter();
  const img = hexStaticMapUrl({
    lat: g.centerLat,
    lng: g.centerLng,
    width: 640,
    height: 420,
    zoom: g.zoom,
  });
  const firstTile = g.tiles[0];
  const isSingle = g.tiles.length === 1;
  return (
    <div
      onClick={() => router.push(`/h/${encodeURIComponent(firstTile.h3)}`)}
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md transition-colors hover:bg-white/40"
    >
      <div className="relative aspect-[3/2] overflow-hidden">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={`Satellite view of ${g.citiesLabel}`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(120% 80% at 50% 50%, rgba(255, 255, 255, 0.16), transparent 60%), radial-gradient(60% 60% at 80% 20%, rgba(255, 255, 255, 0.16), transparent 70%)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Hexagon className="text-primary opacity-40" size={56} strokeWidth={1.4} />
            </div>
          </>
        )}
        <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-md border border-white/40 bg-white/30 px-2 py-1 text-[11px] font-medium text-foreground backdrop-blur-md">
          <Flag code={g.countryCode} size={15} />
          <span className="max-w-[160px] truncate">{g.citiesLabel}</span>
        </div>
        <span className="absolute right-2 top-2 flex items-center gap-1.5">
          {!isSingle && (
            <span className="inline-flex items-center gap-1 rounded-md border border-white/40 bg-white/30 px-2 py-1 text-[11px] font-semibold text-foreground backdrop-blur-md">
              <Layers size={11} strokeWidth={2} />
              {g.tiles.length} hexes
            </span>
          )}
          <span className="rounded border border-primary/30 bg-primary/15 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary backdrop-blur-md">
            T{g.representativeTier}
          </span>
        </span>
      </div>
      <div className="border-t border-foreground/10 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-foreground">
              {isSingle
                ? g.neighborhood ?? g.citiesLabel
                : `${g.tiles.length} hexes in ${g.countryName ?? g.citiesLabel}`}
            </div>
            <div className="mt-0.5 text-[11px] tabular-nums text-foreground/55">
              {Math.abs(g.centerLat).toFixed(3)}°{g.centerLat >= 0 ? 'N' : 'S'},{' '}
              {Math.abs(g.centerLng).toFixed(3)}°{g.centerLng >= 0 ? 'E' : 'W'}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                className="rounded-md p-1.5 text-foreground/60 transition-colors hover:bg-foreground/[0.06] hover:text-foreground"
                aria-label="Property actions"
              >
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem asChild>
                <Link href={`/map#${firstTile.h3}`}>View on map</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction('list', firstTile)}>
                List for sale{!isSingle && ' (first hex)'}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onAction('transfer', firstTile)}>
                Transfer{!isSingle && ' (first hex)'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onAction('details', firstTile)}>
                Details
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-xs text-foreground/55">
            {isSingle ? 'Paid' : 'Total paid'}
          </span>
          <span className="text-sm font-medium tabular-nums text-foreground">
            {g.totalSol.toFixed(3)} SOL
          </span>
        </div>
      </div>
    </div>
  );
}
