'use client';

import dynamic from 'next/dynamic';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { User as PrivyUser } from '@privy-io/react-auth';

// ─────────────────────────────────────────────────────────────
// The wallet stack (Privy SDK + wallet-adapter + their deps) is ~40% of
// first-load JS on every page. This module is the LIGHT half: a plain
// context with the same ActiveWallet surface, safe to import anywhere.
// The heavy half (components/wallet/wallet-engine.tsx) loads dynamically
// after hydration - immediately when a previous session or an OAuth
// callback is detected, on idle otherwise - and publishes real state
// into this context. Until then consumers see ready:false, exactly like
// the SDK-hydration window they already handle.
//
// IMPORTANT: only `import type` from @privy-io / @solana here - a value
// import would drag the stack right back into every page.
// ─────────────────────────────────────────────────────────────

export type ActiveWalletSource = 'privy' | null;

/** A contract write ready for the wallet: address/abi/functionName/args/value. */
export type WriteCall = {
  address: `0x${string}`;
  abi: readonly unknown[] | unknown[];
  functionName: string;
  args?: readonly unknown[] | unknown[];
  value?: bigint;
};

export type ActiveWallet = {
  source: ActiveWalletSource;
  /** 0x-address, or null if not connected */
  address: `0x${string}` | null;
  /** Whether the SDK has finished hydrating from storage. Use this to avoid showing stale UI. */
  ready: boolean;
  /** Whether a wallet (embedded or external via Privy) is connected */
  connected: boolean;
  /** Execute a contract write. Resolves to the transaction hash. */
  writeContract: ((call: WriteCall) => Promise<`0x${string}`>) | null;
  /** personal_sign over a UTF-8 message (property images, throne actions). */
  signMessage: ((message: string) => Promise<`0x${string}`>) | null;
  /** Open Privy login modal (covers social AND wallet login). */
  login: () => void;
  logout: () => Promise<void>;
  /** Kept for API compat - opens the same Privy modal. */
  openWalletModal: () => void;
  /** Privy embedded-wallet key export. Null until the engine loads / non-Privy session. */
  exportWallet: ((address: string) => Promise<void>) | null;
};

export type PrivyUserState = {
  user: PrivyUser | null;
  ready: boolean;
  /** Opens the X (Twitter) OAuth link flow. Null until the engine loads. */
  linkTwitter?: (() => void) | null;
  /** Unlinks the X account with the given subject id. */
  unlinkTwitter?: ((subject: string) => Promise<unknown>) | null;
  /** Privy auth token for server-side verification calls. */
  getAccessToken?: (() => Promise<string | null>) | null;
};

type Published = { wallet: ActiveWallet; privy: PrivyUserState };

type WalletCtx = {
  wallet: ActiveWallet;
  privy: PrivyUserState;
  publish: (p: Published) => void;
};

const Ctx = createContext<WalletCtx | null>(null);

const WalletEngine = dynamic(() => import('@/components/wallet/wallet-engine'), {
  ssr: false,
});

function hasLikelySession(): boolean {
  try {
    if (window.location.search.includes('privy_')) return true; // OAuth callback
    if (localStorage.getItem('walletName')) return true; // adapter autoConnect
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('privy:')) return true;
    }
  } catch {
    /* storage blocked - fall through to idle load */
  }
  return false;
}

export function WalletStateProvider({ children }: { children: ReactNode }) {
  const [published, setPublished] = useState<Published | null>(null);
  const [engineWanted, setEngineWanted] = useState(false);
  // A login/picker click that lands before the engine has loaded is queued
  // and replayed the moment real state is published.
  const pendingRef = useRef<null | 'login' | 'walletModal'>(null);

  const demand = useCallback((action?: 'login' | 'walletModal') => {
    if (action) pendingRef.current = action;
    setEngineWanted(true);
  }, []);

  const stub = useMemo<ActiveWallet>(
    () => ({
      source: null,
      address: null,
      ready: false,
      connected: false,
      writeContract: null,
      signMessage: null,
      login: () => demand('login'),
      logout: async () => {},
      openWalletModal: () => demand('walletModal'),
      exportWallet: null,
    }),
    [demand],
  );

  // Load the engine: instantly for returning sessions / OAuth callbacks,
  // on idle for fresh visitors (off the critical path either way).
  useEffect(() => {
    if (hasLikelySession()) {
      setEngineWanted(true);
      return;
    }
    const kick = () => setEngineWanted(true);
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(kick, { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(kick, 800);
    return () => window.clearTimeout(t);
  }, []);

  const publish = useCallback((p: Published) => setPublished(p), []);

  // Replay a queued action once the engine reports ready.
  useEffect(() => {
    if (!published?.wallet.ready || !pendingRef.current) return;
    const action = pendingRef.current;
    pendingRef.current = null;
    if (action === 'login') published.wallet.login();
    else published.wallet.openWalletModal();
  }, [published]);

  const value = useMemo<WalletCtx>(
    () => ({
      wallet: published?.wallet ?? stub,
      privy: published?.privy ?? { user: null, ready: false },
      publish,
    }),
    [published, stub, publish],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {engineWanted && <WalletEngine />}
    </Ctx.Provider>
  );
}

export function useActiveWallet(): ActiveWallet {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useActiveWallet requires WalletStateProvider');
  return ctx.wallet;
}

/** Privy user snapshot (social login identity) - null until the engine loads. */
export function usePrivyUser(): PrivyUserState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePrivyUser requires WalletStateProvider');
  return ctx.privy;
}

/** Engine-side only: push real wallet state into the shim. */
export function useWalletPublish(): (p: Published) => void {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWalletPublish requires WalletStateProvider');
  return ctx.publish;
}
