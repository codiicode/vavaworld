'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Owner-facing dialog to put a tile up for sale. Stub — wires up to the
 * secondary-market program in a later milestone.
 */
export function ListTileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const numeric = Number(price);
  const valid = Number.isFinite(numeric) && numeric > 0;
  const fee = valid ? numeric * 0.025 : 0;
  const proceeds = valid ? numeric - fee : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <div className="space-y-1.5">
          <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
            List tile for sale
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-muted-foreground">
            Set your asking price. You can cancel or relist at any time before a buyer commits.
          </DialogPrimitive.Description>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Price (SOL)
            </label>
            <Input
              autoFocus
              inputMode="decimal"
              placeholder="0.000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-10 text-base tabular-nums"
            />
          </div>

          <dl className="space-y-1.5 rounded-md border border-border bg-muted/40 p-3 text-xs">
            <Row label="Marketplace fee (2.5%)" value={`${fee.toFixed(4)} SOL`} />
            <Row label="You receive" value={`${proceeds.toFixed(4)} SOL`} bold />
          </dl>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            disabled={!valid || submitting}
            onClick={async () => {
              setSubmitting(true);
              await new Promise((r) => setTimeout(r, 900));
              setSubmitting(false);
              setPrice('');
              onOpenChange(false);
            }}
          >
            {submitting && <Loader2 className="mr-2 animate-spin" size={14} />}
            List for sale
          </Button>
        </div>
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
