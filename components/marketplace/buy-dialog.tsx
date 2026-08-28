'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Info, Loader2 } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Flag } from '@/components/flag';
import type { Listing } from '@/lib/mock-marketplace';
import { getConnection } from '@/lib/anchor-client';
import { preflight } from '@/lib/preflight';
import { useActiveWallet } from '@/lib/active-wallet';
import { dispatchListingsChanged } from '@/lib/supabase-listings';

type Quote = {
  listingId: string;
  seller: string;
  priceSol: number;
  feeBps: number;
  transfers: Array<{ to: string; lamports: number; label: string }>;
  totalLamports: number;
};

type Phase = 'quote' | 'ready' | 'signing' | 'settling' | 'done' | 'error';

/**
 * Real secondary-market buy. The server quotes the exact transfer set
 * (95/4/1, or 97/2/1 for baron sellers), the buyer signs one
 * transaction with those transfers, and the server verifies it on-chain
 * before ownership flips. Sellers keep 95% (97% for barons).
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
  const wallet = useActiveWallet();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [phase, setPhase] = useState<Phase>('quote');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !listing) return;
    setPhase('quote');
    setQuote(null);
    setError(null);
    let alive = true;
    fetch(`/api/buy?listingId=${encodeURIComponent(listing.id)}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? 'Quote failed');
        return json as Quote;
      })
      .then((q) => {
        if (alive) {
          setQuote(q);
          setPhase('ready');
        }
      })
      .catch((e) => {
        if (alive) {
          setError(e instanceof Error ? e.message : String(e));
          setPhase('error');
        }
      });
    return () => {
      alive = false;
    };
  }, [open, listing]);

  if (!listing) return null;

  const fee = quote ? (quote.totalLamports * quote.feeBps) / 10_000 / 1e9 : null;
  const sellerGets = quote ? quote.transfers.find((t) => t.label === 'seller')!.lamports / 1e9 : null;

  const buy = async () => {
    if (!quote) return;
    if (!wallet.connected || !wallet.publicKey || !wallet.signAndSendTransaction) {
      setError('Connect a wallet first');
      return;
    }
    setError(null);
    setPhase('signing');
    try {
      const connection = getConnection();
      const buyer = new PublicKey(wallet.publicKey.toString());
      const tx = new Transaction();
      for (const t of quote.transfers) {
        if (t.lamports > 0) {
          tx.add(
            SystemProgram.transfer({
              fromPubkey: buyer,
              toPubkey: new PublicKey(t.to),
              lamports: t.lamports,
            }),
          );
        }
      }
      tx.feePayer = buyer;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
      await preflight({
        connection,
        feePayer: buyer,
        tx,
        lamportsNeeded: quote.totalLamports,
      });
      const sig = await wallet.signAndSendTransaction(tx);
      await connection.confirmTransaction(sig, 'confirmed');

      setPhase('settling');
      const res = await fetch('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: quote.listingId,
          buyer: buyer.toBase58(),
          txSig: sig,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Settlement failed');
      setPhase('done');
      dispatchListingsChanged();
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
            {phase === 'done' ? 'Hex acquired' : 'Confirm purchase'}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-muted-foreground">
            {phase === 'done'
              ? 'Ownership has been transferred to your wallet.'
              : 'One transaction - the price is split between the seller and the protocol.'}
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

          {phase === 'quote' && (
            <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 size={15} className="animate-spin" /> Fetching quote…
            </div>
          )}

          {quote && phase !== 'done' && (
            <dl className="space-y-2 text-sm">
              <Row label="Price" value={`${quote.priceSol.toFixed(3)} SOL`} bold />
              <Row
                label={`Marketplace fee (${(quote.feeBps / 100).toFixed(0)}%, seller-side)`}
                value={`${fee!.toFixed(4)} SOL`}
                muted
              />
              <Row label="Seller receives" value={`${sellerGets!.toFixed(4)} SOL`} muted />
            </dl>
          )}

          {phase === 'done' && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-900">
              <CheckCircle2 size={15} />
              Yours. The register updates in a few seconds.
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-900">
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
            <Button
              disabled={!quote || phase === 'signing' || phase === 'settling'}
              onClick={() => void buy()}
            >
              {phase === 'signing' ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Sign in wallet…
                </span>
              ) : phase === 'settling' ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Settling…
                </span>
              ) : (
                `Buy for ${listing.price.toFixed(3)} SOL`
              )}
            </Button>
          )}
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
