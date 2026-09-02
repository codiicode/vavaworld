import { network } from "hardhat";

/**
 * Local integration seed: deploy VavaTiles + mocks on the running
 * localhost node, make ETH- and USDG-paid claims via real EIP-712
 * quotes, and print the addresses for the keeper E2E.
 *
 * Accounts (hardhat defaults): [0]=admin/claimer, [1]=keeper, [2]=treasury.
 */
const { ethers } = await network.connect({ network: "localhost" });

const [admin, keeper, treasury] = await ethers.getSigners();

const Vava = await ethers.getContractFactory("MockVava");
const vava = await Vava.deploy();
const usdg = await Vava.deploy();

const Tiles = await ethers.getContractFactory("VavaTiles");
const tiles = await Tiles.deploy(treasury.address, keeper.address, await vava.getAddress());
await tiles.setUsdg(await usdg.getAddress());

// keeper inventory for reference-mode embeds
await vava.mint(keeper.address, 10_000_000_000_000n);
// admin claims with USDG too
await usdg.mint(admin.address, 1_000_000_000_000n);
await usdg.approve(await tiles.getAddress(), 1_000_000_000_000n);

const domain = {
  name: "VAVAWORLD",
  version: "1",
  chainId: (await ethers.provider.getNetwork()).chainId,
  verifyingContract: await tiles.getAddress(),
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

// 5 hexes paid in ETH
const ethH3s = [1n, 2n, 3n, 4n, 5n].map((i) => 0x8c1fb46741ae900n + i * 2n);
const ethPrices = ethH3s.map(() => ethers.parseEther("0.0001"));
const ethTiers = ethH3s.map(() => 3);
const sigEth = await keeper.signTypedData(domain, types, {
  claimer: admin.address, payToken: ethers.ZeroAddress,
  h3s: ethH3s, prices: ethPrices, tiers: ethTiers, countries: ethH3s.map(() => 0), expiry,
});
await tiles.claim(ethH3s, ethPrices, ethTiers, ethH3s.map(() => 0), expiry, ethers.ZeroAddress, sigEth, {
  value: ethPrices.reduce((s, p) => s + p, 0n),
});

// 3 hexes paid in USDG ($0.10 each)
const usdH3s = [11n, 12n, 13n].map((i) => 0x8c1fb46741ae900n + i * 2n);
const usdPrices = usdH3s.map(() => 100_000n);
const usdTiers = usdH3s.map(() => 1);
const usdgAddr = await usdg.getAddress();
const sigUsd = await keeper.signTypedData(domain, types, {
  claimer: admin.address, payToken: usdgAddr,
  h3s: usdH3s, prices: usdPrices, tiers: usdTiers, countries: usdH3s.map(() => 0), expiry,
});
await tiles.claim(usdH3s, usdPrices, usdTiers, usdH3s.map(() => 0), expiry, usdgAddr, sigUsd);

console.log(JSON.stringify({
  tiles: await tiles.getAddress(),
  vava: await vava.getAddress(),
  usdg: usdgAddr,
  pendingWei: (await tiles.totalPendingWei()).toString(),
  pendingUsd: (await tiles.totalPendingUsd()).toString(),
}));
