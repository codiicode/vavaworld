'use client';

import type { ReactNode } from 'react';
import { PrivyProviders } from '@/components/PrivyProviders';
import { WalletProviders } from '@/components/WalletProviders';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrivyProviders>
      <WalletProviders>{children}</WalletProviders>
    </PrivyProviders>
  );
}
