'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Info, Loader2 } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Flag } from '@/components/flag';
import { useActiveWallet } from '@/lib/active-wallet';
import { placeBidOnChain } from '@/lib/bid-chain';

type Phase = 'input' | 'signing' | 'done' | 'error';

/**
 * Make an offer on any claimed hex - listed or not, and below ask is
 * fine. The offered SOL is locked in an on-chain escrow the moment the
 * bid is placed: accept settles instantly, decline/withdraw refunds
 * automatically.
 */
export function BidDialog({
  h3,
  placeLabel,
  countryCode,
  askSol,
  open,
  onOpenChange,
  onPlaced,
}: {
  h3: string;
  placeLabel: string;
  countryCode?: string | null;
  /** Current listing price, if the hex is listed - shown as reference. */
  askSol?: number | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
  onPlaced?: () => void;
}) {
  const wallet = useActiveWallet();
  const [amount, setAmount] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [error, setError] = useState<string | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setPhase('input');
    setError(null);
    setAmount('');
    let alive = true;
    fetch('/api/sol-price')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j?.solUsd) setSolUsd(j.solUsd);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open]);

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;
  const usdApprox = valid && solUsd ? parsed * solUsd : null;

  const submit = async () => {
    if (!valid) return;
    if (!wallet.connected || !wallet.publicKey || !wallet.signAndSendTransaction) {
      setError('Log in first');
      return;
    }
    setError(null);
    setPhase('signing');
    try {
      await placeBidOnChain({
        wallet,
        h3,
        lamports: Math.round(parsed * 1e9),
      });
      setPhase('done');
      onPlaced?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <div className="space-y-1.5">
          <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
            {phase === 'done' ? 'Offer sent' : 'Make an offer'}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-muted-foreground">
            {phase === 'done'
              ? 'Your SOL is locked in escrow and the owner has been notified. Accept makes the hex yours instantly; decline refunds you automatically.'
              : 'Name your price. The amount is held in a secure on-chain escrow - refunded in full if the owner declines or you withdraw.'}
          </DialogPrimitive.Description>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-md border border-border bg-muted/40 p-3">
            <Flag code={countryCode} size={22} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{placeLabel}</div>
              <div className="truncate font-mono text-[10px] text-muted-foreground">{h3}</div>
            </div>
            {askSol != null && (
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ask</div>
                <div className="text-xs font-semibold tabular-nums">{askSol.toFixed(3)} SOL</div>
              </div>
            )}
          </div>

          {phase !== 'done' && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Your offer (SOL)
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.000"
                  className="h-10 w-full rounded-md border border-border bg-background px-3 pr-14 text-sm tabular-nums outline-none transition-colors focus:border-primary"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  SOL
                </span>
              </div>
              <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                <span>{usdApprox != null ? `≈ $${usdApprox.toFixed(2)}` : ' '}</span>
                {askSol != null && valid && parsed < askSol && (
                  <span>{Math.round((1 - parsed / askSol) * 100)}% below ask</span>
                )}
              </div>
            </div>
          )}

          {phase === 'done' && (
            <div className="flex items-center gap-2 rounded-md border border-white/12 bg-white/[0.04] px-3 py-2.5 text-sm text-white/80">
              <CheckCircle2 size={15} />
              {parsed.toFixed(3)} SOL locked in escrow - offer live.
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-900 dark:text-red-200">
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {phase === 'done' ? 'Close' : 'Cancel'}
          </Button>
          {phase !== 'done' && (
            <Button disabled={!valid || phase === 'signing'} onClick={() => void submit()}>
              {phase === 'signing' ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Sign in wallet…
                </span>
              ) : (
                'Place offer'
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
