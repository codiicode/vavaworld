'use client';

import { useEffect, type ReactNode } from 'react';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';
import { PrivyProviders } from '@/components/PrivyProviders';
import { WalletProviders } from '@/components/WalletProviders';

export function Providers({ children }: { children: ReactNode }) {
  // Windows ships without colour flag emoji glyphs. The polyfill injects a Twemoji
  // webfont so 🇸🇪/🇺🇸/etc. render as actual flags rather than text fallbacks.
  useEffect(() => {
    polyfillCountryFlagEmojis();
  }, []);

  return (
    <PrivyProviders>
      <WalletProviders>{children}</WalletProviders>
    </PrivyProviders>
  );
}
