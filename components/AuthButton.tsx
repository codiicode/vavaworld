'use client';

import { useEffect, useState } from 'react';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useActiveWallet } from '@/lib/active-wallet';
import { getConnection } from '@/lib/anchor-client';

function shortAddr(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function AuthButton() {
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

  if (!wallet.connected) {
    return (
      <button
        onClick={wallet.login}
        className="absolute top-5 right-5 z-20 transition-all"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: '13.5px',
          fontWeight: 500,
          padding: '10px 18px',
          background: 'var(--signal)',
          color: '#000',
          border: '1px solid var(--signal)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
        onMouseLeave={(e) => (e.currentTarget.style.filter = '')}
      >
        Sign in
      </button>
    );
  }

  return (
    <div className="absolute top-5 right-5 z-20">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 transition-colors"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
          padding: '10px 16px',
          background: 'rgba(12, 15, 18, 0.85)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid var(--hairline)',
          color: 'var(--ink)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--ink-2)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--hairline)')}
      >
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--signal)', boxShadow: '0 0 8px var(--signal)' }}
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
            background: 'rgba(12, 15, 18, 0.92)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid var(--hairline)',
          }}
        >
          <button
            onClick={async () => {
              await wallet.logout();
              setOpen(false);
            }}
            className="w-full px-4 py-2.5 text-left transition-colors"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '10.5px',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'var(--ink-2)',
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
