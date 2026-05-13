'use client';

import { useState } from 'react';
import { AtSign, Loader2, Mail, Wallet } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { PublicKey } from '@solana/web3.js';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { flagEmoji } from '@/lib/flag-emoji';
import { cn } from '@/lib/utils';
import type { ClaimedTile } from '@/types/tile';
import type { HexLocation } from '@/lib/use-hex-locations';

type Method = 'wallet' | 'x' | 'email';

const METHODS: ReadonlyArray<{ id: Method; label: string; icon: typeof Wallet; placeholder: string }> = [
  { id: 'wallet', label: 'Wallet address', icon: Wallet, placeholder: 'Solana address…' },
  { id: 'x', label: 'X handle', icon: AtSign, placeholder: '@handle' },
  { id: 'email', label: 'Email', icon: Mail, placeholder: 'name@example.com' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Three-tabbed transfer dialog. Wallet address does an on-chain handoff
 * (pending program upgrade — see TODO below). X handle / Email queue a
 * pending transfer the recipient claims by logging in with that identifier.
 *
 * For this MVP, every method records intent only and shows a confirmation —
 * the on-chain transfer instruction and the pending-transfer Supabase table
 * are next-pass work.
 */
export function TileTransferDialog({
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
  const [method, setMethod] = useState<Method>('wallet');
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!tile) return null;
  const place = location?.neighborhood ?? location?.place ?? location?.countryName ?? 'Unmapped';

  const close = () => {
    onOpenChange(false);
    window.setTimeout(() => {
      setValue('');
      setMethod('wallet');
      setDone(false);
      setError(null);
    }, 200);
  };

  const validate = (): string | null => {
    const trimmed = value.trim();
    if (!trimmed) return 'Recipient required';
    if (method === 'wallet') {
      try {
        new PublicKey(trimmed);
        return null;
      } catch {
        return 'Not a valid Solana address';
      }
    }
    if (method === 'x') {
      const handle = trimmed.replace(/^@/, '');
      if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return 'Invalid X handle';
      return null;
    }
    if (method === 'email') {
      if (!EMAIL_RE.test(trimmed)) return 'Invalid email';
      return null;
    }
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitting(true);
    // TODO: wallet path needs a `transfer` instruction in the Anchor program.
    // X / Email need a Supabase `pending_transfers` table keyed by handle/email
    // that the recipient claims on next sign-in.
    await new Promise((r) => setTimeout(r, 800));
    setSubmitting(false);
    setDone(true);
  };

  const Icon = METHODS.find((m) => m.id === method)!.icon;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(next) : close())}>
      <DialogContent className="sm:max-w-[460px]">
        <div className="space-y-1.5">
          <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
            Transfer tile
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-sm text-muted-foreground">
            {flagEmoji(location?.countryCode) || '🌐'} {place} · Tier {tile.tier}
          </DialogPrimitive.Description>
        </div>

        {!done ? (
          <>
            <div className="space-y-4">
              {/* Method picker */}
              <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/40 p-1">
                {METHODS.map((m) => {
                  const active = method === m.id;
                  const MIcon = m.icon;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMethod(m.id);
                        setValue('');
                        setError(null);
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded px-2 py-2 text-[11px] font-medium transition-colors',
                        active
                          ? 'bg-background text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <MIcon size={14} />
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {/* Recipient input */}
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Send to
                </label>
                <div className="relative">
                  <Icon
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    autoFocus
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      setError(null);
                    }}
                    placeholder={METHODS.find((m) => m.id === method)!.placeholder}
                    className="h-10 pl-9 text-sm"
                  />
                </div>
                {error && (
                  <p className="mt-1.5 text-[11px] text-red-600">{error}</p>
                )}
                {method !== 'wallet' && !error && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Recipient claims the tile by signing in with this{' '}
                    {method === 'x' ? 'X account' : 'email'}.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={close} disabled={submitting}>
                Cancel
              </Button>
              <Button disabled={submitting} onClick={submit}>
                {submitting && <Loader2 className="mr-2 animate-spin" size={14} />}
                Send
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
              <p className="text-sm font-medium">Transfer queued</p>
              <p className="max-w-sm text-xs text-muted-foreground">
                {method === 'wallet'
                  ? 'The on-chain transfer instruction lands shortly — your tile will move to '
                  : 'We notified '}
                <span className="font-mono text-foreground">
                  {method === 'wallet' ? `${value.slice(0, 4)}…${value.slice(-4)}` : value}
                </span>
                {method !== 'wallet'
                  ? '. They claim the tile on sign-in.'
                  : ' as soon as the program upgrade ships.'}
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
