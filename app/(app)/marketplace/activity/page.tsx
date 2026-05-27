'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { mockActivity } from '@/lib/mock-marketplace';
import { flagEmoji } from '@/lib/flag-emoji';

/**
 * Full activity log — the "see more" target from the right-rail mini-feed.
 *
 * Same dense, scannable table style as the main marketplace.
 */
export default function ActivityPage() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-3 md:px-6 md:py-4">
        <div>
          <Link
            href="/marketplace"
            className="mb-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft size={12} />
            Back to marketplace
          </Link>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Activity</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Live feed</span>
        </div>
      </div>

      {/* Mobile: horizontal scroll so the 7-column trade log stays legible. */}
      <div className="flex-1 overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Hex</TableHead>
              <TableHead>From</TableHead>
              <TableHead />
              <TableHead>To</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="w-20 text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockActivity.map((a, i) => (
              <TableRow key={a.id} className="h-12">
                <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(3, '0')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{flagEmoji(a.countryCode)}</span>
                    <div>
                      <div className="text-sm font-medium leading-tight">{a.city}</div>
                      <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                        {a.neighborhood}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs">{a.fromAddr}</TableCell>
                <TableCell className="w-6 text-muted-foreground">
                  <ArrowRight size={12} />
                </TableCell>
                <TableCell className="font-mono text-xs">{a.toAddr}</TableCell>
                <TableCell className="text-right text-sm font-semibold tabular-nums">
                  {a.price.toFixed(3)} SOL
                </TableCell>
                <TableCell className="text-right text-[11px] tabular-nums text-muted-foreground">
                  {a.ago} ago
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
