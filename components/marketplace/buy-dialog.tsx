'use client';

import { Info } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Flag } from '@/components/flag';
import type { Listing } from '@/lib/mock-marketplace';

/**
 * Honest "buy is coming" dialog. The on-chain secondary-market program isn't
 * deployed yet, so we can't actually transfer the hex + escrow SOL - and we
 * refuse to fake it. When the contract ships, this dialog becomes the real
 * confirm step.
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
  if (!listing) return null;

  const fee = listing.price * 0.025;
  const total = listing.price + fee;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <div className="space-y-1.5">
          <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
            Buying is coming soon
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-muted-foreground">
            Listings are live. Secondary-market settlement ships next.
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

          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-900">
            <Info size={14} className="mt-0.5 flex-shrink-0" />
            <p className="leading-relaxed">
              The on-chain secondary-market program isn&apos;t deployed yet, so
              we can&apos;t escrow SOL or transfer ownership atomically. Rather
              than fake it, we&apos;re holding off - buys go live with the
              contract.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Got it
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
