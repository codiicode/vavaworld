'use client';

import { getPublicClient, TILES_ABI, TILES_ADDRESS, h3ToUint64 } from './evm';
import type { ActiveWallet } from './wallet-context';

/**
 * On-chain bid escrow, EVM edition. The contract holds the bid's ETH;
 * accept splits 95/5 (97/3 for baron-staked sellers) and flips the hex
 * atomically; decline/cancel auto-refund. After each action we mirror to
 * the API, which re-verifies contract state server-side.
 */

async function call(
  wallet: ActiveWallet,
  functionName: string,
  h3: string,
  value?: bigint,
): Promise<`0x${string}`> {
  if (!wallet.writeContract) throw new Error('Log in first');
  const hash = await wallet.writeContract({
    address: TILES_ADDRESS,
    abi: TILES_ABI,
    functionName,
    args: [h3ToUint64(h3)],
    value,
  });
  await getPublicClient().waitForTransactionReceipt({ hash });
  return hash;
}

async function mirror(path: string, body: Record<string, unknown>): Promise<void> {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error ? `Settled on-chain, sync failed: ${j.error}` : 'Settled on-chain, sync failed');
  }
}

/** Lock `wei` in the bid escrow and notify the owner. */
export async function placeBidOnChain(args: {
  wallet: ActiveWallet;
  h3: string;
  wei: bigint;
}): Promise<void> {
  const { wallet, h3, wei } = args;
  await call(wallet, 'placeBid', h3, wei);
  await mirror('/api/bids', { h3, bidder: wallet.address });
}

/** Withdraw own bid - escrow refunds in the same transaction. */
export async function cancelBidOnChain(args: {
  wallet: ActiveWallet;
  h3: string;
  bidId: string;
}): Promise<void> {
  const { wallet, h3, bidId } = args;
  const sig = await call(wallet, 'cancelBid', h3);
  await mirror('/api/bids/respond', { bidId, txSig: sig });
}

/** Owner declines - bidder auto-refunded on-chain. */
export async function declineBidOnChain(args: {
  wallet: ActiveWallet;
  h3: string;
  bidId: string;
  bidder: string;
}): Promise<void> {
  const { wallet, h3, bidId } = args;
  const sig = await call(wallet, 'declineBid', h3);
  await mirror('/api/bids/respond', { bidId, txSig: sig });
}

/**
 * Owner accepts - one atomic transaction: escrow splits 95/5 (97/3 for
 * baron-staked sellers) between seller and treasury, and the hex flips
 * to the bidder.
 */
export async function acceptBidOnChain(args: {
  wallet: ActiveWallet;
  h3: string;
  bidId: string;
  bidder: string;
}): Promise<void> {
  const { wallet, h3, bidId } = args;
  const sig = await call(wallet, 'acceptBid', h3);
  await mirror('/api/bids/respond', { bidId, txSig: sig });
}

/** The live on-chain ask for a hex (0 = not listed). */
export async function readListingAsk(h3: string): Promise<bigint> {
  return (await getPublicClient().readContract({
    address: TILES_ADDRESS,
    abi: TILES_ABI,
    functionName: 'listings',
    args: [h3ToUint64(h3)],
  })) as bigint;
}

/** Put the hex up for sale on-chain - buy() settles against THIS ask. */
export async function listOnChain(args: {
  wallet: ActiveWallet;
  h3: string;
  askWei: bigint;
}): Promise<`0x${string}`> {
  const { wallet, h3, askWei } = args;
  if (!wallet.writeContract) throw new Error('Log in first');
  const hash = await wallet.writeContract({
    address: TILES_ADDRESS,
    abi: TILES_ABI,
    functionName: 'list',
    args: [h3ToUint64(h3), askWei],
  });
  await getPublicClient().waitForTransactionReceipt({ hash });
  return hash;
}

export async function delistOnChain(args: {
  wallet: ActiveWallet;
  h3: string;
}): Promise<`0x${string}`> {
  return call(args.wallet, 'delist', args.h3);
}

/**
 * Atomic listing purchase: pay the ask, hex flips in the same tx. The
 * contract demands msg.value == ask EXACTLY, so the amount sent is read
 * from the contract, never from the quote (a float that went through the
 * DB); `expectedWei` only guards against a seller re-listing higher
 * since the buyer looked.
 */
export async function buyListingOnChain(args: {
  wallet: ActiveWallet;
  h3: string;
  expectedWei: bigint;
}): Promise<`0x${string}`> {
  const { wallet, h3, expectedWei } = args;
  const ask = await readListingAsk(h3);
  if (ask === 0n) throw new Error('This hex is not listed on-chain - ask the seller to re-list');
  if (ask > (expectedWei * 102n) / 100n) throw new Error('The asking price changed - reload and try again');
  return call(wallet, 'buy', h3, ask);
}

/** Read the live on-chain owner of a hex (zero address = unclaimed). */
export async function readHexOwner(h3: string): Promise<`0x${string}`> {
  const hex = (await getPublicClient().readContract({
    address: TILES_ADDRESS,
    abi: TILES_ABI,
    functionName: 'hexes',
    args: [h3ToUint64(h3)],
  })) as readonly [`0x${string}`, bigint, number, bigint, bigint];
  return hex[0];
}
