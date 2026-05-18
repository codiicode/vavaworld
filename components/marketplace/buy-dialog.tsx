'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Flag } from '@/components/flag';
import type { Listing } from '@/lib/mock-marketplace';

/**
 * Confirmation dialog before the on-chain buy. UI only at this stage — the
 * actual swap/transfer hooks land alongside the secondary-market program.
 */
export function BuyDialog({
  listing,
  open,
  onOpenChange,
}: {
  listing: Listing | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  if (!listing) return null;

  const fee = listing.price * 0.025;
  const total = listing.price + fee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <div className="space-y-1.5">
          <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
            Confirm purchase
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-muted-foreground">
            You&apos;re about to claim this hex from its current holder.
          </DialogPrimitive.Description>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3">
            <Flag code={listing.countryCode} size={22} />
            <div className="flex-1">
              <div className="text-sm font-medium">{listing.city}</div>
              <div className="text-xs text-muted-foreground">{listing.neighborhood}</div>
            </div>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
              T{listing.tier}
            </span>
          </div>

          <dl className="space-y-2 text-sm">
            <Row label="List price" value={`${listing.price.toFixed(3)} SOL`} />
            <Row label="Marketplace fee (2.5%)" value={`${fee.toFixed(4)} SOL`} muted />
            <div className="border-t border-border pt-2">
              <Row label="Total" value={`${total.toFixed(4)} SOL`} bold />
            </div>
          </dl>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            disabled={submitting}
            onClick={async () => {
              setSubmitting(true);
              await new Promise((r) => setTimeout(r, 900));
              setSubmitting(false);
              onOpenChange(false);
            }}
          >
            {submitting && <Loader2 className="mr-2 animate-spin" size={14} />}
            Confirm purchase
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? 'text-xs text-muted-foreground' : 'text-sm text-muted-foreground'}>
        {label}
      </dt>
      <dd
        className={
          bold
            ? 'text-sm font-semibold tabular-nums'
            : muted
              ? 'text-xs tabular-nums text-muted-foreground'
              : 'text-sm tabular-nums'
        }
      >
        {value}
      </dd>
    </div>
  );
}
