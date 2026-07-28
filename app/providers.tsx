'use client';

import { type ReactNode } from 'react';
import { PrivyProviders } from '@/components/PrivyProviders';
import { WalletProviders } from '@/components/WalletProviders';

export function Providers({ children }: { children: ReactNode }) {
  // Flags are real SVGs (see components/flag.tsx) - no emoji, no webfont
  // polyfill needed; emoji flags don't render on Windows anyway.
  return (
    <PrivyProviders>
      <WalletProviders>{children}</WalletProviders>
    </PrivyProviders>
  );
}
