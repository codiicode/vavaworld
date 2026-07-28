'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BondMoreModal } from './nation-modals';
import { type Nation, fmtInt } from '@/lib/mock-nations';

export function YourPositionCard({ nation }: { nation: Nation }) {
  const [open, setOpen] = useState(false);
  const u = nation.userPosition;

  return (
    <div className="rounded-2xl border border-white/40 bg-white/30 p-6 backdrop-blur-md">
      <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground/55">
        Your position
      </div>

      <div className="grid grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4">
        <Stat label="Rank" value={`#${u.rank} of ${fmtInt(u.of)}`} />
        <Stat label="Bonded" value={`${fmtInt(u.bondedVava)} $VAVA`} />
        <Stat label="Monthly yield" value={`$${u.monthlyUsd.toFixed(2)}`} />
        <Stat label="Your hexes here" value={fmtInt(u.hexesHere)} />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => setOpen(true)}>Bond more $VAVA</Button>
        <Button variant="outline" asChild>
          <Link href="/profile">View my hexes</Link>
        </Button>
      </div>

      <BondMoreModal
        open={open}
        onOpenChange={setOpen}
        countryName={nation.name}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wider text-foreground/50">
        {label}
      </div>
      <div className="text-lg font-bold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}
