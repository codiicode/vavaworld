'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, X as XIcon } from 'lucide-react';
import { XBadge } from '@/components/x-badge';
import { useActiveWallet } from '@/lib/active-wallet';
import { usePrivyUser } from '@/lib/wallet-context';
import { useSupabaseProfile } from '@/lib/supabase-profile';
import { invalidateAddress, queueAddress } from '@/lib/username-store';

/**
 * Verified X account control on /profile. The link itself happens via
 * Privy's OAuth flow (proves control of the X account); the badge is
 * then written server-side by /api/verify-x after re-checking the
 * linked account against Privy's API. Site usernames stay freely
 * chosen - the badge is what can't be faked.
 */
export function ConnectX({ onChanged }: { onChanged?: () => void }) {
  const wallet = useActiveWallet();
  const privy = usePrivyUser();
  const [version, setVersion] = useState(0);
  const { profile } = useSupabaseProfile(wallet.address, version);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const attemptedRef = useRef<string | null>(null);

  const verified = profile?.x_handle ?? null;
  const linkedHandle = privy.user?.twitter?.username ?? null;
  const linkedSubject = privy.user?.twitter?.subject ?? null;
  const isPrivy = wallet.source === 'privy';

  const bumpEverywhere = () => {
    if (wallet.address) {
      invalidateAddress(wallet.address);
      queueAddress(wallet.address);
    }
    setVersion((v) => v + 1);
    onChanged?.();
  };

  const verify = async () => {
    if (!wallet.address || !privy.getAccessToken) return;
    setBusy(true);
    setError(null);
    try {
      const token = await privy.getAccessToken();
      if (!token) throw new Error('No Privy session');
      const res = await fetch('/api/verify-x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authToken: token, address: wallet.address }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Verification failed');
      bumpEverywhere();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  // After the OAuth flow completes, Privy's user object gains .twitter -
  // auto-run the server verification once per linked handle.
  useEffect(() => {
    if (!linkedHandle || !wallet.address) return;
    if (verified === linkedHandle) return;
    if (attemptedRef.current === linkedHandle) return;
    attemptedRef.current = linkedHandle;
    void verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedHandle, verified, wallet.address]);

  const disconnect = async () => {
    if (!linkedSubject || !privy.unlinkTwitter) return;
    setBusy(true);
    setError(null);
    try {
      await privy.unlinkTwitter(linkedSubject);
      attemptedRef.current = null;
      // Mirror the unlink: the server sees no linked X and clears the badge.
      await verify();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!wallet.connected) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {verified ? (
        <>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/30 py-1 pl-1.5 pr-2.5 text-xs font-medium text-foreground">
            <XBadge handle={verified} size={11} />
            @{verified}
            <span className="text-[10px] font-normal uppercase tracking-wider text-white/60">
              Verified
            </span>
          </span>
          {isPrivy && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void disconnect()}
              className="inline-flex items-center gap-1 text-[11px] text-foreground/50 transition-colors hover:text-foreground disabled:opacity-50"
            >
              {busy ? <Loader2 size={10} className="animate-spin" /> : <XIcon size={10} />}
              Disconnect
            </button>
          )}
        </>
      ) : isPrivy ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setError(null);
            if (linkedHandle) {
              // Already linked in Privy but not yet mirrored - just verify.
              void verify();
            } else {
              privy.linkTwitter?.();
            }
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/40 bg-white/30 px-3 py-1.5 text-[13px] font-medium text-foreground/70 backdrop-blur-md transition-colors hover:bg-white/50 hover:text-foreground disabled:opacity-50"
        >
          {busy ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" width={12} height={12} fill="currentColor" aria-hidden>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          )}
          Verify with X
        </button>
      ) : (
        <span className="text-[11px] text-foreground/50">
          Sign in with VAVAWORLD (not an external wallet) to verify your X account.
        </span>
      )}
      {error && <span className="text-[11px] text-red-600 dark:text-red-300">{error}</span>}
    </div>
  );
}
