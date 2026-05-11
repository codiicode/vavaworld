'use client';

import { useEffect, useState } from 'react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useActiveWallet } from '@/lib/active-wallet';
import { getConnection } from '@/lib/anchor-client';

function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function AuthButton({ onDark = false }: { onDark?: boolean }) {
  const wallet = useActiveWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  // Auto-trigger Privy login when arriving via /map?login=true (from landing's Log in CTA).
  // Wait for SDK to hydrate first — otherwise we'd open the modal even for users who already
  // have a session (which would just dismiss as no-op but flash the UI).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!wallet.ready) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('login') === 'true' && !wallet.connected) {
      wallet.login();
    }
    if (params.has('login')) {
      params.delete('login');
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
      window.history.replaceState({}, '', newUrl);
    }
  }, [wallet.ready, wallet.connected, wallet.login, wallet]);

  // Fetch balance when wallet changes
  useEffect(() => {
    if (!wallet.publicKey) {
      setBalance(null);
      return;
    }
    const conn: Connection = getConnection();
    let cancelled = false;
    (async () => {
      try {
        const lamports = await conn.getBalance(wallet.publicKey!);
        if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL);
      } catch {
        if (!cancelled) setBalance(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [wallet.publicKey]);

  // Don't show anything until SDK has hydrated — prevents "Sign in" flash on returning users
  if (!wallet.ready) {
    return null;
  }

  // Brand-blue filled CTA — works on both dark satellite (high contrast)
  // and light /profile background. Pill shape, Inter, matches the landing nav primary.
  if (!wallet.connected) {
    return (
      <button
        onClick={wallet.login}
        className="absolute top-5 right-5 z-20 transition-all"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '13.5px',
          fontWeight: 500,
          padding: '10px 22px',
          background: 'var(--signal)',
          color: '#ffffff',
          border: '1.5px solid var(--signal)',
          borderRadius: 999,
          letterSpacing: '0.01em',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--signal-deep)';
          e.currentTarget.style.borderColor = 'var(--signal-deep)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--signal)';
          e.currentTarget.style.borderColor = 'var(--signal)';
        }}
      >
        Sign in
      </button>
    );
  }

  // Wallet pill — translucent white glass over satellite imagery,
  // brand-blue accent dot + Inter mono numerals.
  const pillBg = onDark ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.62)';
  return (
    <div className="absolute top-5 right-5 z-20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 transition-colors"
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: '12.5px',
          fontWeight: 500,
          padding: '10px 18px',
          background: pillBg,
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          border: '1px solid var(--hairline)',
          borderRadius: 999,
          color: 'var(--ink)',
          fontFeatureSettings: '"tnum"',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--signal)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--hairline)')}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--signal)' }}
        />
        <span>{shortAddr(wallet.address ?? '')}</span>
        {balance !== null && (
          <span style={{ color: 'var(--dim)' }}>· {balance.toFixed(3)} SOL</span>
        )}
      </button>
      {open && (
        <div
          className="mt-1.5"
          style={{
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(14px) saturate(140%)',
            WebkitBackdropFilter: 'blur(14px) saturate(140%)',
            border: '1px solid var(--hairline)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          <button
            onClick={async () => {
              await wallet.logout();
              setOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left transition-colors"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '11px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'var(--ink-2)',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--signal)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink-2)')}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
