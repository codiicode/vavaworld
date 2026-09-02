import { createPublicClient, defineChain, fallback, http, type PublicClient } from 'viem';
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
  contracts: {
    multicall3: { address: '0xcA11bde05977b3631167028862bE2a173976CA11' },
  },
});

let _client: PublicClient | null = null;
export function getPublicClient(): PublicClient {
  if (_client) return _client;
  // The public RPC drops bursts under launch-day load ("Failed to fetch"
  // straight to the user). Retry each request, and in the browser fall
  // back to our own /api/rpc proxy - a different network path, so a
  // Cloudflare hiccup between the visitor and the RPC doesn't kill the UI.
  // The RPC rate-limits per IP, so VOLUME is the real enemy: batch JSON-RPC
  // calls into one HTTP request, and collapse concurrent contract reads into
  // multicall3 aggregates (the map's per-hex status reads went from ~800
  // requests per pan to a handful).
  const direct = http(getEvmRpcUrl(), {
    retryCount: 3,
    retryDelay: 300,
    timeout: 12_000,
    batch: { wait: 20 },
  });
  const transport =
    typeof window === 'undefined'
      ? direct
      : fallback(
          [
            direct,
            // batchSize stays under the relay's 50-call array cap.
            http('/api/rpc', { retryCount: 2, timeout: 15_000, batch: { wait: 20, batchSize: 40 } }),
          ],
          { rank: false },
        );
  _client = createPublicClient({
    chain: robinhoodChain,
    transport,
    batch: { multicall: { wait: 30 } },
  });
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
    { name: 'payToken', type: 'address' },
    { name: 'h3s', type: 'uint64[]' },
    { name: 'prices', type: 'uint256[]' },
    { name: 'tiers', type: 'uint8[]' },
    { name: 'countries', type: 'uint16[]' },
    { name: 'expiry', type: 'uint256' },
  ],
} as const;

const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_EVM_CHAIN_ID === '4663'
    ? 'https://explorer.mainnet.chain.robinhood.com'
    : 'https://explorer.testnet.chain.robinhood.com';

export function explorerTxUrl(hash: string): string {
  return `${EXPLORER_BASE}/tx/${hash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${EXPLORER_BASE}/address/${address}`;
}

/** ISO alpha-2 -> uint16 ('SE' = 0x5345); unknown/INTL -> 0 (treasury keeps the president cut). */
export function packCountry(iso: string | null | undefined): number {
  if (!iso || iso.length !== 2) return 0;
  const s = iso.toUpperCase();
  return (s.charCodeAt(0) << 8) | s.charCodeAt(1);
}

/** Zero address = pay in native ETH; the USDG address = pay in dollars. */
export const NATIVE_PAY = '0x0000000000000000000000000000000000000000' as `0x${string}`;
export const USDG_ADDRESS = (process.env.NEXT_PUBLIC_USDG_CONTRACT ?? '') as `0x${string}`;
