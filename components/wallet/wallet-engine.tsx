'use client';

import { PrivyProviders } from '@/components/PrivyProviders';
import { WalletBridge } from './wallet-bridge';

/**
 * The HEAVY half of the wallet stack - Privy SDK, wallet-adapter and their
 * modals. Loaded via next/dynamic from WalletStateProvider so none of it is
 * in any page's first-load JS. It wraps only the bridge (which mirrors state
 * into the light context), not the app - both SDKs render their UI through
 * portals/fixed overlays so mounting them here is enough.
 */
export default function WalletEngine() {
  return (
    <PrivyProviders>
      <WalletBridge />
    </PrivyProviders>
  );
}
