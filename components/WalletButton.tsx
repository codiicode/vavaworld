'use client';

import dynamic from 'next/dynamic';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((m) => m.WalletMultiButton),
  { ssr: false },
);

export function WalletButton() {
  return (
    <div className="absolute top-4 right-4 z-20">
      <WalletMultiButton />
    </div>
  );
}
