import { readFileSync } from "node:fs";
import { network } from "hardhat";

/**
 * Scripted rehearsal against an ALREADY DEPLOYED VavaTiles (testnet or
 * mainnet stand-in phase): mint stand-in inventory, claim in ETH and in
 * USDG via real keeper-signed EIP-712 quotes, and print the pending
 * totals for the keeper pass that follows.
 *
 * Env:
 *   DEPLOYMENT_FILE     deployments/<net>.json (default testnet)
 *   EVM_DEPLOYER_KEY    claimer/admin (the hardhat network signer)
 *   KEEPER_TESTNET_KEY  keeper private key - signs the quotes
 */
const file = process.env.DEPLOYMENT_FILE ?? "deployments/testnet.json";
const dep = JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"));
const keeperKey = process.env.KEEPER_TESTNET_KEY;
if (!keeperKey) throw new Error("KEEPER_TESTNET_KEY required");

const conn = await network.connect();
const { ethers } = conn;
const [admin] = await ethers.getSigners();
const keeper = new ethers.Wallet(keeperKey, ethers.provider);

const tiles = await ethers.getContractAt("VavaTiles", dep.tiles);
const vava = await ethers.getContractAt("MockVava", dep.standinVava);
const usdg = await ethers.getContractAt("MockVava", dep.usdg);

// keeper inventory for reference-mode embeds (MockVava mint is open)
await (await vava.mint(dep.keeper, 10_000_000_000_000n)).wait();
// On testnet the USDG stand-in is mintable; REAL mainnet USDG is not -
// the USDG leg is then skipped (its code path is testnet-proven, and the
// clicked rehearsal can exercise it with real USDG if the user holds any).
let usdgLeg = true;
try {
  await (await usdg.mint(admin.address, 1_000_000_000_000n)).wait();
  await (await usdg.approve(dep.tiles, 1_000_000_000_000n)).wait();
} catch {
  usdgLeg = false;
  console.error("USDG not mintable (real token) - skipping the USDG leg");
}

const domain = {
  name: "VAVAWORLD",
  version: "1",
  chainId: (await ethers.provider.getNetwork()).chainId,
  verifyingContract: dep.tiles,
};
const types = {
  VavaClaim: [
    { name: "claimer", type: "address" },
    { name: "payToken", type: "address" },
    { name: "h3s", type: "uint64[]" },
    { name: "prices", type: "uint256[]" },
    { name: "tiers", type: "uint8[]" },
    { name: "countries", type: "uint16[]" },
    { name: "expiry", type: "uint256" },
  ],
};
const now = (await ethers.provider.getBlock("latest"))!.timestamp;
const expiry = now + 600;
// Salted per run so a re-run never collides with hexes already claimed.
const salt = BigInt(Date.now() % 100_000) * 32n;

const ethH3s = [1n, 2n, 3n, 4n, 5n].map((i) => 0x8c1fb46741ae900n + salt + i * 2n);
const ethPrices = ethH3s.map(() => ethers.parseEther("0.0001"));
const ethTiers = ethH3s.map(() => 3);
const sigEth = await keeper.signTypedData(domain, types, {
  claimer: admin.address, payToken: ethers.ZeroAddress,
  h3s: ethH3s, prices: ethPrices, tiers: ethTiers, countries: ethH3s.map(() => 0), expiry,
});
const txEth = await tiles.claim(ethH3s, ethPrices, ethTiers, ethH3s.map(() => 0), expiry, ethers.ZeroAddress, sigEth, {
  value: ethPrices.reduce((s, p) => s + p, 0n),
});
await txEth.wait();

let usdgTxHash = null;
if (usdgLeg) {
  const usdH3s = [11n, 12n, 13n].map((i) => 0x8c1fb46741ae900n + salt + i * 2n);
  const usdPrices = usdH3s.map(() => 100_000n);
  const usdTiers = usdH3s.map(() => 1);
  const sigUsd = await keeper.signTypedData(domain, types, {
    claimer: admin.address, payToken: dep.usdg,
    h3s: usdH3s, prices: usdPrices, tiers: usdTiers, countries: usdH3s.map(() => 0), expiry,
  });
  const txUsd = await tiles.claim(usdH3s, usdPrices, usdTiers, usdH3s.map(() => 0), expiry, dep.usdg, sigUsd);
  await txUsd.wait();
  usdgTxHash = txUsd.hash;
}

console.log(JSON.stringify({
  tiles: dep.tiles,
  claimEthTx: txEth.hash,
  claimUsdgTx: usdgTxHash,
  treasuryBalanceWei: (await ethers.provider.getBalance(dep.treasury)).toString(),
  pendingWei: (await tiles.totalPendingWei()).toString(),
  pendingUsd: (await tiles.totalPendingUsd()).toString(),
}));
