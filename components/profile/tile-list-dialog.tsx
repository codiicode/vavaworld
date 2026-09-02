'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Flag } from '@/components/flag';
import { useActiveWallet } from '@/lib/active-wallet';
import {
  createListing,
  dispatchListingsChanged,
} from '@/lib/supabase-listings';
import type { ClaimedTile } from '@/types/tile';
import type { HexLocation } from '@/lib/use-hex-locations';

import { fmtUsdValue } from '@/lib/usd';
/**
 * "List for sale" dialog opened from the tile row "..." menu.
 *
 * Owner-side action - the secondary-market program isn't on-chain yet, so
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
  const [error, setError] = useState<string | null>(null);
  const wallet = useActiveWallet();
  const [ethUsd, setEthUsd] = useState<number | null>(null);

  // The field is dollars but the listing settles in native coin, so a
  // live rate is required before submit - never a fallback constant.
  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch('/api/eth-price')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.ethUsd > 0) setEthUsd(j.ethUsd);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open]);

  if (!tile) return null;

  // All figures below are dollars; conversion to native happens at submit.
  const numeric = Number(price);
  const valid = Number.isFinite(numeric) && numeric > 0 && ethUsd !== null;
  const fee = valid ? numeric * 0.025 : 0;
  const proceeds = valid ? numeric - fee : 0;
  const paidUsd = tile.paidUsd;
  const place = location?.neighborhood ?? location?.place ?? location?.countryName ?? 'Unmapped';

  const close = () => {
    onOpenChange(false);
    // Defer reset so the dialog fade-out doesn't show empty fields
    window.setTimeout(() => {
      setPrice('');
      setDone(false);
      setError(null);
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
                  Asking price ($)
                </label>
                <Input
                  autoFocus
                  inputMode="decimal"
                  placeholder={paidUsd > 0 ? paidUsd.toFixed(2) : '0.00'}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-10 text-base tabular-nums"
                />
                <p className="mt-1 text-[11px] text-muted-foreground tabular-nums">
                  You paid {fmtUsdValue(paidUsd)}
                </p>
              </div>

              <dl className="space-y-1.5 rounded-md border border-border bg-muted/40 p-3 text-xs">
                <Row label="Marketplace fee (2.5%)" value={fmtUsdValue(fee)} />
                <Row label="You receive" value={fmtUsdValue(proceeds)} bold />
              </dl>

              {error && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={close} disabled={submitting}>
                Cancel
              </Button>
              <Button
                disabled={!valid || submitting || !wallet.address}
                onClick={async () => {
                  if (!wallet.address) {
                    setError('Log in first');
                    return;
                  }
                  setSubmitting(true);
                  setError(null);
                  try {
                    // Lazy-mirror the hex into Supabase before listing. The
                    // on-chain claim happened via the Anchor program and may
                    // not have hit the `hexes` table yet (or at all for old
                    // claims). 409 = already mirrored → safe to proceed.
                    const mirror = await fetch('/api/claim', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ h3: tile.h3, owner: wallet.address }),
                    });
                    if (!mirror.ok && mirror.status !== 409) {
                      const j = await mirror.json().catch(() => ({} as { error?: string }));
                      throw new Error(j.error ?? 'Could not register hex');
                    }

                    if (!wallet.signMessage) throw new Error('Wallet cannot sign messages');
                    if (!ethUsd) throw new Error('Live price unavailable - try again');
                    await createListing({
                      h3: tile.h3,
                      seller: wallet.address,
                      // Typed in dollars; the listing column holds native coin.
                      priceSol: numeric / ethUsd,
                      signMessage: wallet.signMessage,
                    });
                    dispatchListingsChanged();
                    setDone(true);
                  } catch (e: unknown) {
                    setError(e instanceof Error ? e.message : 'List failed');
                  } finally {
                    setSubmitting(false);
                  }
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
                style={{ background: 'rgba(255, 255, 255, 0.14)', color: 'var(--brand, #ffffff)' }}
              >
                ✓
              </div>
              <p className="text-sm font-medium">Listed</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Your hex is live in the marketplace at{' '}
                <span className="tabular-nums text-foreground">{fmtUsdValue(numeric)}</span>.
                On-chain settlement happens when the marketplace contract ships;
                until then the listing is held off-chain.
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
