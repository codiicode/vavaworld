/** One tiny real swap through VavaV4Swapper to prove the v4 path works. */
import { createWalletClient, createPublicClient, http, parseAbi, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';

const RPC = 'https://rpc.mainnet.chain.robinhood.com/rpc';
const SWAPPER = '0xd1bd2084d6031020775093b036309df476be9f3a';
const VAVA = '0x0967afE6dC2Af73aDb9E2d62195ebCDEe37324b5';
// The live Pons migration pool: native ETH / VAVA, dyn-fee hook.
const KEY = {
  currency0: '0x0000000000000000000000000000000000000000',
  currency1: VAVA,
  fee: 0,
  tickSpacing: 200,
  hooks: '0xE5e702641Ea86F4ae6cC3cDaeD2B886f976Be044',
} as const;

async function main() {
  const key = readFileSync('.keeper-mainnet.key', 'utf8').trim();
  const account = privateKeyToAccount(key as `0x${string}`);
  const chain = {
    id: 4663,
    name: 'robinhood',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [RPC] } },
  } as const;
  const pub = createPublicClient({ chain, transport: http(RPC) });
  const wallet = createWalletClient({ account, chain, transport: http(RPC) });

  const erc20 = parseAbi(['function balanceOf(address) view returns (uint256)']);
  const abi = parseAbi([
    'function buyExactIn((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, uint256 minOut) payable returns (uint256)',
  ]);

  const before = await pub.readContract({ address: VAVA, abi: erc20, functionName: 'balanceOf', args: [account.address] });
  const hash = await wallet.writeContract({
    address: SWAPPER,
    abi,
    functionName: 'buyExactIn',
    args: [KEY, 0n],
    value: 500_000_000_000_000n, // 0.0005 ETH
  });
  const rc = await pub.waitForTransactionReceipt({ hash });
  const after = await pub.readContract({ address: VAVA, abi: erc20, functionName: 'balanceOf', args: [account.address] });
  console.log('status:', rc.status, 'tx:', hash);
  console.log('VAVA köpt:', formatUnits(after - before, 18));
}

main().catch((e) => {
  console.error(String(e).slice(0, 400));
  process.exit(1);
});
