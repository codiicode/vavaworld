import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LeaderboardRow } from './leaderboard-row';
import { TOTAL_HOLDERS, type RowView, type Scope } from '@/lib/mock-leaderboard';

const TH =
  'text-[10px] uppercase tracking-[0.08em] font-medium text-foreground/60';

export function LeaderboardTable({
  rows,
  scope,
  scopeName,
  total,
}: {
  rows: RowView[];
  scope: Scope;
  scopeName: string | null;
  total: number;
}) {
  const isWorldwide = scope === 'worldwide';
  const first = rows[0]?.rank ?? 0;
  const last = rows[rows.length - 1]?.rank ?? 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/30 px-6 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
          {isWorldwide ? 'All Rankings' : `${scopeName} Rankings`}
          {!isWorldwide && (
            <Link
              href={`/nations/${String(scope).toUpperCase()}`}
              className="inline-flex items-center gap-0.5 text-xs font-medium text-primary underline-offset-2 hover:underline"
            >
              View nation <ArrowUpRight size={13} />
            </Link>
          )}
        </h2>
        <span className="text-xs tabular-nums text-foreground/60">
          {rows.length === 0
            ? 'No holders match this filter'
            : isWorldwide
              ? `Showing ${first}-${last} of ${TOTAL_HOLDERS.toLocaleString('en-US')} holders`
              : `Showing ${first}-${last} of ${total.toLocaleString('en-US')} holders in ${scopeName}`}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-white/30 hover:bg-transparent">
            <TableHead className={`${TH} w-20`}>Rank</TableHead>
            <TableHead className={TH}>Player</TableHead>
            {isWorldwide && (
              <TableHead className={`${TH} w-16 text-center`}>Country</TableHead>
            )}
            <TableHead className={`${TH} text-right`}>
              {isWorldwide ? 'Hexes' : `Hexes in ${scopeName}`}
            </TableHead>
            <TableHead className={`${TH} text-right`}>$VAVA Bonded</TableHead>
            <TableHead className={`${TH} text-right`}>Value</TableHead>
            {isWorldwide && (
              <TableHead className={`${TH} text-right`}>24h Volume</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <LeaderboardRow key={r.entry.walletAddress} row={r} scope={scope} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
