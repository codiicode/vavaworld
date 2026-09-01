import { createPublicClient, defineChain, http, type PublicClient } from 'viem';
import abiJson from './evm-abi.json';

/**
 * EVM chain wiring for Robinhood Chain (Arbitrum Orbit L2).
 * Chain ids / RPC urls come from env so testnet -> mainnet is an env flip,
 * exactly like the Solana devnet -> mainnet cutover was.
 */

export const TILES_ABI = (abiJson as { abi: unknown[] }).abi;

export const TILES_ADDRESS = (process.env.NEXT_PUBLIC_TILES_CONTRACT ?? '') as `0x${string}`;

export function getEvmRpcUrl(): string {
  // Server-side prefers the unrestricted key (no Origin header on server
  // calls); the browser bundle only ever sees NEXT_PUBLIC_.
  return process.env.EVM_RPC_URL ?? process.env.NEXT_PUBLIC_EVM_RPC_URL ?? '';
}

export const robinhoodChain = defineChain({
  id: Number(process.env.NEXT_PUBLIC_EVM_CHAIN_ID ?? 0),
  name: 'Robinhood Chain',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [getEvmRpcUrl()] } },
});

let _client: PublicClient | null = null;
export function getPublicClient(): PublicClient {
  if (_client) return _client;
  _client = createPublicClient({ chain: robinhoodChain, transport: http(getEvmRpcUrl()) });
  return _client;
}

/** H3 cell index string ("8c1fb46741ae9ff") <-> uint64 for the contract. */
export function h3ToUint64(h3: string): bigint {
  const v = BigInt('0x' + h3);
  if (v <= 0n || v > 0xffffffffffffffffn) throw new Error(`h3 out of range: ${h3}`);
  return v;
}

export function uint64ToH3(v: bigint): string {
  return v.toString(16);
}

/** EIP-712 claim quote - MUST mirror VavaTiles.sol exactly. */
export const CLAIM_DOMAIN = (chainId: number, contract: `0x${string}`) => ({
  name: 'VAVAWORLD',
  version: '1',
  chainId,
  verifyingContract: contract,
});

export const CLAIM_TYPES = {
  VavaClaim: [
    { name: 'claimer', type: 'address' },
    { name: 'h3s', type: 'uint64[]' },
    { name: 'pricesWei', type: 'uint256[]' },
    { name: 'tiers', type: 'uint8[]' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;
