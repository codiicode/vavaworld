import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Flag } from '@/components/flag';
import { GradientAvatar } from '@/components/gradient-avatar';
import { RankDelta } from '@/components/rank-delta';
import {
  type Nation,
  fmtUsd3,
  fmtInt,
  fmtCompact,
  initials,
} from '@/lib/mock-nations';

const TH =
  'text-[10px] uppercase tracking-[0.08em] font-medium text-foreground/60';

export function NationsTable({
  rows,
  startRank,
  total,
}: {
  rows: Nation[];
  startRank: number;
  total: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/30 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/30 px-6 py-4">
        <h2 className="text-base font-semibold tracking-tight">All nations</h2>
        <span className="text-xs tabular-nums text-foreground/60">
          {rows.length > 0
            ? `Showing ${startRank}-${startRank + rows.length - 1} of ${fmtInt(total)} nations`
            : 'No nations match'}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-white/30 hover:bg-transparent">
            <TableHead className={`${TH} w-16`}>Rank</TableHead>
            <TableHead className={TH}>Country</TableHead>
            <TableHead className={TH}>President</TableHead>
            <TableHead className={`${TH} text-right`}>Floor</TableHead>
            <TableHead className={`${TH} text-right`}>Claims</TableHead>
            <TableHead className={`${TH} text-right`}>Bonded $VAVA</TableHead>
            <TableHead className={`${TH} text-right`}>Bonders</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((n, i) => (
            <TableRow
              key={n.iso}
              className="cursor-pointer border-white/20 transition-colors hover:bg-white/20"
            >
              <TableCell className="w-20 text-foreground/60">
                <Link href={`/nations/${n.iso}`} className="flex items-center gap-2">
                  <span className="font-mono text-sm tabular-nums">
                    {String(startRank + i).padStart(2, '0')}
                  </span>
                  <RankDelta delta={n.rankDelta} />
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/nations/${n.iso}`} className="flex items-center gap-3">
                  <Flag code={n.iso} size={20} />
                  <span className="truncate text-sm font-medium">{n.name}</span>
                  <span className="text-[10px] uppercase tracking-wider text-foreground/40">
                    {n.iso}
                  </span>
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/nations/${n.iso}`} className="flex items-center gap-2">
                  <GradientAvatar
                    seed={n.president.wallet || n.president.username}
                    initial={initials(n.president.username)}
                    className="h-7 w-7 ring-white/40"
                    textClassName="text-[11px]"
                  />
                  <span className="truncate text-sm">@{n.president.username}</span>
                </Link>
              </TableCell>
              <TableCell className="text-right text-sm font-semibold tabular-nums">
                {fmtUsd3(n.floor)}
              </TableCell>
              <TableCell className="text-right text-sm font-semibold tabular-nums">
                {fmtInt(n.claims)}
              </TableCell>
              <TableCell className="text-right text-sm font-semibold tabular-nums">
                {fmtCompact(n.bondedVava)}
              </TableCell>
              <TableCell className="text-right text-sm font-semibold tabular-nums">
                {fmtInt(n.bonders)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
