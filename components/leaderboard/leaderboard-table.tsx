import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LeaderboardRow } from './leaderboard-row';
import { TOTAL_HOLDERS, type LeaderboardEntry } from '@/lib/mock-leaderboard';

const TH =
  'text-[10px] uppercase tracking-[0.08em] font-medium text-foreground/60';

export function LeaderboardTable({ rows }: { rows: LeaderboardEntry[] }) {
  const first = rows[0]?.rank ?? 0;
  const last = rows[rows.length - 1]?.rank ?? 0;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md">
      <div className="flex flex-col gap-1 border-b border-white/30 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6 md:py-4">
        <h2 className="text-base font-semibold tracking-tight">All Rankings</h2>
        <span className="text-[11px] tabular-nums text-foreground/60 md:text-xs">
          {rows.length > 0
            ? `Showing ${first}–${last} of ${TOTAL_HOLDERS.toLocaleString()} holders`
            : `No holders match this filter`}
        </span>
      </div>

      {/* Horizontal scroll on mobile keeps all 6 cols legible without cramming. */}
      <div className="overflow-x-auto">
        <Table>
        <TableHeader>
          <TableRow className="border-white/30 hover:bg-transparent">
            <TableHead className={`${TH} w-16`}>Rank</TableHead>
            <TableHead className={TH}>Player</TableHead>
            <TableHead className={`${TH} w-16 text-center`}>Country</TableHead>
            <TableHead className={`${TH} text-right`}>Hexes</TableHead>
            <TableHead className={`${TH} text-right`}>Value</TableHead>
            <TableHead className={`${TH} text-right`}>24h Volume</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((e) => (
            <LeaderboardRow key={e.rank} entry={e} />
          ))}
        </TableBody>
        </Table>
      </div>
    </div>
  );
}
