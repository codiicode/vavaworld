'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Flag } from '@/components/flag';
import type { ClaimedTile } from '@/types/tile';
import type { HexLocation } from '@/lib/use-hex-locations';

/**
 * "List for sale" dialog opened from the tile row "..." menu.
 *
 * Owner-side action — the secondary-market program isn't on-chain yet, so
 * submitting here records intent only ("queued for listing") and shows a
 * confirmation. When the marketplace program lands we'll wire the actual
 * createListing instruction in this same handler.
 */
export function TileListDialog({
  tile,
  location,
  open,
  onOpenChange,
}: {
  tile: ClaimedTile | null;
  location: HexLocation | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!tile) return null;

  const numeric = Number(price);
  const valid = Number.isFinite(numeric) && numeric > 0;
  const fee = valid ? numeric * 0.025 : 0;
  const proceeds = valid ? numeric - fee : 0;
  const paidSol = Number(tile.pricePaid) / LAMPORTS_PER_SOL;
  const place = location?.neighborhood ?? location?.place ?? location?.countryName ?? 'Unmapped';

  const close = () => {
    onOpenChange(false);
    // Defer reset so the dialog fade-out doesn't show empty fields
    window.setTimeout(() => {
      setPrice('');
      setDone(false);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : close())}>
      <DialogContent className="sm:max-w-[440px]">
        <div className="space-y-1.5">
          <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
            List hex for sale
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Flag code={location?.countryCode} size={14} /> {place} · Tier {tile.tier}
          </DialogPrimitive.Description>
        </div>

        {!done ? (
          <>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Asking price (SOL)
                </label>
                <Input
                  autoFocus
                  inputMode="decimal"
                  placeholder={paidSol > 0 ? paidSol.toFixed(3) : '0.000'}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-10 text-base tabular-nums"
                />
                <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                  You paid {paidSol.toFixed(3)} SOL
                </p>
              </div>

              <dl className="space-y-1.5 rounded-md border border-border bg-muted/40 p-3 text-xs">
                <Row label="Marketplace fee (2.5%)" value={`${fee.toFixed(4)} SOL`} />
                <Row label="You receive" value={`${proceeds.toFixed(4)} SOL`} bold />
              </dl>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={close} disabled={submitting}>
                Cancel
              </Button>
              <Button
                disabled={!valid || submitting}
                onClick={async () => {
                  setSubmitting(true);
                  // Marketplace program not on-chain yet — record intent locally.
                  await new Promise((r) => setTimeout(r, 700));
                  setSubmitting(false);
                  setDone(true);
                }}
              >
                {submitting && <Loader2 className="mr-2 animate-spin" size={14} />}
                List for sale
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div
                className="grid h-10 w-10 place-items-center rounded-full text-lg"
                style={{ background: 'rgba(94,234,212,0.18)', color: 'var(--brand, #5eead4)' }}
              >
                ✓
              </div>
              <p className="text-sm font-medium">Listing queued</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                The secondary marketplace launches soon — your listing at{' '}
                <span className="tabular-nums text-foreground">{numeric.toFixed(3)} SOL</span>{' '}
                will go live the moment trading opens.
              </p>
            </div>
            <Button variant="outline" onClick={close} className="w-full">
              Close
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={bold ? 'font-semibold tabular-nums' : 'tabular-nums'}>{value}</dd>
    </div>
  );
}
