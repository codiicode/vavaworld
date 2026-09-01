import type { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

/** Robinhood Chain: 100% EVM (Arbitrum Orbit). RPC urls land in env at
 *  deploy time; the local network covers the whole test suite. */
const config: HardhatUserConfig = {
  plugins: [hardhatToolboxMochaEthersPlugin],
  networks: {
    localhost: { type: "http", url: "http://127.0.0.1:8545" },
  },
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 800 }, viaIR: true },
  },
};

export default config;
