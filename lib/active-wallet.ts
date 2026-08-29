'use client';

// The implementation lives in lib/wallet-context (light shim) +
// components/wallet/wallet-bridge (heavy engine, dynamically loaded).
// This module keeps the historical import path for the ~20 consumers.
export { useActiveWallet } from './wallet-context';
export type { ActiveWallet, ActiveWalletSource } from './wallet-context';
