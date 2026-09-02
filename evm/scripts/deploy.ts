import { network } from "hardhat";

/**
 * Deploy VavaTiles to the network given by HARDHAT_NETWORK (or --network).
 *
 * Env:
 *   TREASURY_ADDRESS  hardware-wallet treasury (0x...), REQUIRED on live nets
 *   KEEPER_ADDRESS    keeper EOA that signs quotes + runs embeds, REQUIRED
 *   STANDIN_MINT      existing stand-in VAVA; omit to deploy a fresh MockVava
 *   USDG_ADDRESS      the chain's USDG token; omit to deploy a MockVava stand-in
 *
 * Prints a JSON blob with every address - paste into the env tables.
 */
const conn = await network.connect();
const { ethers } = conn;

const [deployer] = await ethers.getSigners();
const treasury = process.env.TREASURY_ADDRESS;
const keeper = process.env.KEEPER_ADDRESS;
if (!treasury || !keeper) {
  throw new Error("TREASURY_ADDRESS and KEEPER_ADDRESS are required");
}

let vavaAddr = process.env.STANDIN_MINT;
if (!vavaAddr) {
  const Vava = await ethers.getContractFactory("MockVava");
  const vava = await Vava.deploy();
  await vava.waitForDeployment();
  vavaAddr = await vava.getAddress();
}

let usdgAddr = process.env.USDG_ADDRESS;
if (!usdgAddr) {
  const Usdg = await ethers.getContractFactory("MockVava");
  const usdg = await Usdg.deploy();
  await usdg.waitForDeployment();
  usdgAddr = await usdg.getAddress();
}

const Tiles = await ethers.getContractFactory("VavaTiles");
const tiles = await Tiles.deploy(treasury, keeper, vavaAddr);
await tiles.waitForDeployment();
await (await tiles.setUsdg(usdgAddr)).wait();

console.log(
  JSON.stringify(
    {
      network: conn.networkName ?? process.env.HARDHAT_NETWORK ?? "unknown",
      deployer: deployer.address,
      tiles: await tiles.getAddress(),
      standinVava: vavaAddr,
      usdg: usdgAddr,
      treasury,
      keeper,
    },
    null,
    2,
  ),
);
