import { AnchorProvider, Program, type Idl, type Wallet } from '@coral-xyz/anchor';
import { Connection } from '@solana/web3.js';
import idl from './anchor-idl.json';
import type { Tiles } from './anchor-types';
import type { WalletContextState } from '@solana/wallet-adapter-react';

export const PROGRAM_ID = (idl as { address: string }).address;

export function getRpcUrl(): string {
  return process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com';
}

export function getConnection(): Connection {
  return new Connection(getRpcUrl(), { commitment: 'confirmed' });
}

/**
 * Build a typed Anchor Program for the wallet-adapter wallet.
 * Returns null if wallet is not connected - read-only paths should use getConnection() directly.
 */
export function getProgram(wallet: WalletContextState): Program<Tiles> | null {
  if (!wallet.publicKey || !wallet.signTransaction) return null;
  const connection = getConnection();
  const provider = new AnchorProvider(connection, wallet as unknown as Wallet, {
    commitment: 'confirmed',
  });
  return new Program<Tiles>(idl as Idl, provider);
}
