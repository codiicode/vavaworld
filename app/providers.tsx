'use client';

import { type ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { WalletStateProvider } from '@/lib/wallet-context';

// The heavy wallet stack (Privy + wallet-adapter) is NOT wrapped around the
// app anymore - WalletStateProvider is a light shim that dynamically loads
// components/wallet/wallet-engine after hydration. Keep it that way: a
// static import of either SDK from anything in the page tree puts ~200kB
// back into every page's first load.
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <WalletStateProvider>{children}</WalletStateProvider>
    </ThemeProvider>
  );
}
