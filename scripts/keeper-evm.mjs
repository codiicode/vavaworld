/**
 * Buyback keeper for Robinhood Chain: converts every hex's escrowed 15%
 * (ETH or USDG) into embedded $VAVA via the contract's embed().
 *
 * Flow per pass:
 *   1. Find hexes with pendingAmount > 0 (Claimed logs -> on-chain check).
 *   2. Group by currency, swap each pot into $VAVA (router leg), or use
 *      held inventory in reference mode (rehearsal / no market yet).
 *   3. proRata the bought VAVA over the hexes, embed() in batches - the
 *      contract reimburses the escrow in the same currency per hex.
 *
 * Env:
 *   RPC_URL             Robinhood Chain RPC (required)
 *   TILES_CONTRACT      VavaTiles address (required)
 *   KEEPER_EVM_KEY      0x-prefixed private key - signs embeds + swaps (required)
 *   KEEPER_INTERVAL_SECS  loop mode; unset = one pass
 *   KEEPER_SWAP         'reference' (default) | 'uniswap'
 *   SWAP_ROUTER         Uniswap V3 SwapRouter02 (uniswap mode)
 *   WETH_ADDRESS        wrapped native for the ETH leg (uniswap mode)
 *   POOL_FEE            v3 fee tier, default 3000
 *   START_BLOCK         log scan floor (default: latest - LOG_SPAN)
 *   LOG_SPAN            blocks of history when START_BLOCK unset (default 500000)
 */
import { readFileSync } from 'node:fs';
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseAbi,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { proRata } from './keeper-math.mjs';

const RPC_URL = process.env.RPC_URL;
const TILES = process.env.TILES_CONTRACT ?? process.env.NEXT_PUBLIC_TILES_CONTRACT;
const KEY = process.env.KEEPER_EVM_KEY;
if (!RPC_URL || !TILES || !KEY) {
  console.error('RPC_URL, TILES_CONTRACT and KEEPER_EVM_KEY are required');
  process.exit(1);
}
const INTERVAL = Number(process.env.KEEPER_INTERVAL_SECS ?? 0);
const SWAP_MODE = process.env.KEEPER_SWAP ?? 'reference';
const ROUTER = process.env.SWAP_ROUTER;
const WETH = process.env.WETH_ADDRESS;
const POOL_FEE = Number(process.env.POOL_FEE ?? 3000);
const LOG_SPAN = BigInt(process.env.LOG_SPAN ?? 500_000);
const EMBED_BATCH = Number(process.env.KEEPER_EMBED_BATCH ?? 150);
/** Reference mode prices VAVA at this many USD (devnet-style rehearsal). */
const VAVA_USD = Number(process.env.VAVA_REFERENCE_USD ?? 0.0001);
const ETH_USD_URL = process.env.SOL_PRICE_URL ?? 'https://vavaworld.net/api/sol-price';

const abi = JSON.parse(readFileSync(new URL('../lib/evm-abi.json', import.meta.url), 'utf-8')).abi;
const routerAbi = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96)) payable returns (uint256)',
]);
const erc20Abi = parseAbi([
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
]);

const chain = defineChain({
  id: Number(process.env.CHAIN_ID ?? 0) || 1,
  name: 'robinhood',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});
const account = privateKeyToAccount(KEY);
const pub = createPublicClient({ chain, transport: http(RPC_URL) });
const wallet = createWalletClient({ account, chain, transport: http(RPC_URL) });

const read = (functionName, args = []) =>
  pub.readContract({ address: TILES, abi, functionName, args });


async function findPending() {
  const latest = await pub.getBlockNumber();
  const from = process.env.START_BLOCK
    ? BigInt(process.env.START_BLOCK)
    : latest > LOG_SPAN ? latest - LOG_SPAN : 0n;
  const logs = await pub.getContractEvents({
    address: TILES,
    abi,
    eventName: 'Claimed',
    fromBlock: from,
    toBlock: latest,
  });
  const seen = new Set();
  const out = [];
  for (const log of logs) {
    const h3 = log.args.h3;
    if (seen.has(h3)) continue;
    seen.add(h3);
    const hex = await read('hexes', [h3]);
    // struct tuple: owner, claimedAt, tier, paidInUsdg, pendingAmount, embeddedVava
    const pendingAmount = hex[4];
    if (pendingAmount > 0n) {
      out.push({ h3, pending: pendingAmount, inUsdg: hex[3] });
    }
  }
  return out;
}

async function swapToVava(currency, amountIn, vavaAddr, usdgAddr) {
  if (SWAP_MODE === 'reference') {
    // No market yet: credit at the reference price from held inventory.
    // ETH leg: amountIn wei -> USD via price API -> VAVA base units.
    // USDG leg: amountIn IS usd6 -> VAVA base units directly.
    let usd;
    if (currency === 'eth') {
      const r = await fetch(ETH_USD_URL).then((x) => x.json()).catch(() => null);
      const ethUsd = Number(r?.solUsd ?? r?.ethUsd ?? 4000);
      usd = (Number(amountIn) / 1e18) * ethUsd;
    } else {
      usd = Number(amountIn) / 1e6;
    }
    return BigInt(Math.max(1, Math.round((usd / VAVA_USD) * 1e6)));
  }

  // uniswap mode: real market buy via SwapRouter02 exactInputSingle.
  if (!ROUTER) throw new Error('SWAP_ROUTER required in uniswap mode');
  const tokenIn = currency === 'eth' ? WETH : usdgAddr;
  if (!tokenIn) throw new Error('WETH_ADDRESS required for the ETH leg');
  if (currency === 'usdg') {
    const approveHash = await wallet.writeContract({
      address: usdgAddr, abi: erc20Abi, functionName: 'approve', args: [ROUTER, amountIn],
    });
    await pub.waitForTransactionReceipt({ hash: approveHash });
  }
  const before = await pub.readContract({
    address: vavaAddr, abi: erc20Abi, functionName: 'balanceOf', args: [account.address],
  });
  const hash = await wallet.writeContract({
    address: ROUTER,
    abi: routerAbi,
    functionName: 'exactInputSingle',
    args: [{
      tokenIn, tokenOut: vavaAddr, fee: POOL_FEE, recipient: account.address,
      amountIn, amountOutMinimum: 0n, sqrtPriceLimitX96: 0n,
    }],
    value: currency === 'eth' ? amountIn : 0n,
  });
  await pub.waitForTransactionReceipt({ hash });
  const after = await pub.readContract({
    address: vavaAddr, abi: erc20Abi, functionName: 'balanceOf', args: [account.address],
  });
  return after - before;
}

async function runOnce() {
  const vavaAddr = await read('vava');
  const usdgAddr = await read('usdg');
  const pending = await findPending();
  if (pending.length === 0) {
    console.log('[keeper] nothing pending');
    return;
  }

  // ensure the contract may pull our VAVA
  const allowHash = await wallet.writeContract({
    address: vavaAddr, abi: erc20Abi, functionName: 'approve',
    args: [TILES, (1n << 255n)],
  });
  await pub.waitForTransactionReceipt({ hash: allowHash });

  for (const currency of ['eth', 'usdg']) {
    const group = pending.filter((p) => (currency === 'usdg') === p.inUsdg);
    if (group.length === 0) continue;
    const pot = group.reduce((s, p) => s + p.pending, 0n);
    const bought = await swapToVava(currency, pot, vavaAddr, usdgAddr);
    console.log(`[keeper] ${currency}: pot=${pot} -> ${bought} VAVA units for ${group.length} hexes`);
    const shares = proRata(bought, group.map((g) => g.pending));

    for (let i = 0; i < group.length; i += EMBED_BATCH) {
      const bh = group.slice(i, i + EMBED_BATCH).map((g) => g.h3);
      const ba = shares.slice(i, i + EMBED_BATCH);
      try {
        const hash = await wallet.writeContract({
          address: TILES, abi, functionName: 'embed', args: [bh, ba],
        });
        await pub.waitForTransactionReceipt({ hash });
        console.log(`[keeper] embedded batch of ${bh.length} ${hash.slice(0, 14)}…`);
      } catch (e) {
        // One failing batch must never take the service down.
        console.error(`[keeper] embed batch failed:`, String(e).slice(0, 160));
      }
    }
  }
  console.log('[keeper] pass complete');
}

console.log(`[keeper] rpc=${RPC_URL.split('?')[0]} contract=${TILES} keeper=${account.address} mode=${SWAP_MODE}`);
if (INTERVAL > 0) {
  console.log(`[keeper] service mode, every ${INTERVAL}s`);
  for (;;) {
    try {
      await runOnce();
    } catch (e) {
      console.error('[keeper] pass failed:', String(e).slice(0, 200));
    }
    await new Promise((r) => setTimeout(r, INTERVAL * 1000));
  }
} else {
  await runOnce();
  process.exit(0);
}
