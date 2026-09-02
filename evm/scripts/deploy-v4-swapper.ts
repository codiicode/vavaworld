/**
 * Deploys VavaV4Swapper (the keeper's owner-only Uniswap v4 buyer) from the
 * KEEPER wallet, so the keeper is its owner. One constructor arg: the chain's
 * v4 PoolManager.
 *
 *   EVM_DEPLOYER_KEY=<keeper key> npx hardhat run scripts/deploy-v4-swapper.ts --network mainnet
 */
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';

const POOL_MANAGER = '0x8366a39CC670B4001A1121B8F6A443A643e40951';
const RPC = 'https://rpc.mainnet.chain.robinhood.com/rpc';

async function main() {
  const art = JSON.parse(
    readFileSync('artifacts/contracts/VavaV4Swapper.sol/VavaV4Swapper.json', 'utf8'),
  );
  const key = readFileSync('.keeper-mainnet.key', 'utf8').trim();
  const account = privateKeyToAccount(key as `0x${string}`);
  console.log('deploying from keeper:', account.address);

  const chain = {
    id: 4663,
    name: 'robinhood',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: [RPC] } },
  } as const;
  const pub = createPublicClient({ chain, transport: http(RPC) });
  const wallet = createWalletClient({ account, chain, transport: http(RPC) });

  const hash = await wallet.deployContract({
    abi: art.abi,
    bytecode: art.bytecode,
    args: [POOL_MANAGER],
  });
  const rc = await pub.waitForTransactionReceipt({ hash });
  console.log('VavaV4Swapper:', rc.contractAddress, 'status:', rc.status);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
