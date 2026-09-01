import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

/**
 * Full economic test of the EVM port: every invariant the Solana program
 * enforced, plus the attack cases (forged quotes, wrong payment, foreign
 * removals, cooldown bypass).
 */
describe("VavaTiles", () => {
  async function deploy() {
    const [admin, keeper, treasury, alice, bob] = await ethers.getSigners();

    const Vava = await ethers.getContractFactory("MockVava");
    const vava = await Vava.deploy();

    const Tiles = await ethers.getContractFactory("VavaTiles");
    const tiles = await Tiles.deploy(treasury.address, keeper.address, await vava.getAddress());

    // keeper holds VAVA inventory for embeds
    await vava.mint(keeper.address, 1_000_000_000_000n);
    await vava.connect(keeper).approve(await tiles.getAddress(), 1_000_000_000_000n);
    // alice holds VAVA for staking
    await vava.mint(alice.address, 2_000_000_000_000n);
    await vava.connect(alice).approve(await tiles.getAddress(), 2_000_000_000_000n);

    const domain = {
      name: "VAVAWORLD",
      version: "1",
      chainId: (await ethers.provider.getNetwork()).chainId,
      verifyingContract: await tiles.getAddress(),
    };
    const types = {
      VavaClaim: [
        { name: "claimer", type: "address" },
        { name: "h3s", type: "uint64[]" },
        { name: "pricesWei", type: "uint256[]" },
        { name: "tiers", type: "uint8[]" },
        { name: "expiry", type: "uint256" },
      ],
    };
    const quote = async (
      signer: typeof keeper,
      claimer: string,
      h3s: bigint[],
      pricesWei: bigint[],
      tiers: number[],
      expiry: number,
    ) => signer.signTypedData(domain, types, { claimer, h3s, pricesWei, tiers, expiry });

    const now = async () => (await ethers.provider.getBlock("latest"))!.timestamp;

    return { admin, keeper, treasury, alice, bob, vava, tiles, quote, now };
  }

  const H1 = 0x8c1fb46741ae9ffn;
  const H2 = 0x8c1fb46741a17ffn;
  const PRICE = ethers.parseEther("0.001");

  it("claims with a valid quote and splits 85/15", async () => {
    const { tiles, treasury, alice, keeper, quote, now } = await deploy();
    const expiry = (await now()) + 300;
    const sig = await quote(keeper, alice.address, [H1, H2], [PRICE, PRICE], [1, 3], expiry);

    const tBefore = await ethers.provider.getBalance(treasury.address);
    await tiles.connect(alice).claim([H1, H2], [PRICE, PRICE], [1, 3], expiry, sig, {
      value: PRICE * 2n,
    });

    const tAfter = await ethers.provider.getBalance(treasury.address);
    expect(tAfter - tBefore).to.equal((PRICE * 2n * 8500n) / 10000n);

    const h = await tiles.hexes(H1);
    expect(h.owner).to.equal(alice.address);
    expect(h.tier).to.equal(1);
    expect(h.pendingWei).to.equal((PRICE * 1500n) / 10000n);
    expect(await tiles.totalPendingWei()).to.equal((PRICE * 2n * 1500n) / 10000n);
    expect(await tiles.tierCounts(0)).to.equal(1);
    expect(await tiles.tierCounts(2)).to.equal(1);
  });

  it("REJECTS a forged quote (signed by non-keeper)", async () => {
    const { tiles, alice, bob, quote, now } = await deploy();
    const expiry = (await now()) + 300;
    const sig = await quote(bob as never, alice.address, [H1], [1n], [3], expiry);
    await expect(
      tiles.connect(alice).claim([H1], [1n], [3], expiry, sig, { value: 1n }),
    ).to.be.revertedWithCustomError(tiles, "BadSignature");
  });

  it("REJECTS tampered prices under a real signature", async () => {
    const { tiles, alice, keeper, quote, now } = await deploy();
    const expiry = (await now()) + 300;
    const sig = await quote(keeper, alice.address, [H1], [PRICE], [3], expiry);
    await expect(
      tiles.connect(alice).claim([H1], [1n], [3], expiry, sig, { value: 1n }),
    ).to.be.revertedWithCustomError(tiles, "BadSignature");
  });

  it("REJECTS expired quotes, wrong payment and double claims", async () => {
    const { tiles, alice, keeper, quote, now } = await deploy();
    let expiry = (await now()) - 1;
    let sig = await quote(keeper, alice.address, [H1], [PRICE], [3], expiry);
    await expect(
      tiles.connect(alice).claim([H1], [PRICE], [3], expiry, sig, { value: PRICE }),
    ).to.be.revertedWithCustomError(tiles, "QuoteExpired");

    expiry = (await now()) + 300;
    sig = await quote(keeper, alice.address, [H1], [PRICE], [3], expiry);
    await expect(
      tiles.connect(alice).claim([H1], [PRICE], [3], expiry, sig, { value: PRICE - 1n }),
    ).to.be.revertedWithCustomError(tiles, "WrongPayment");

    await tiles.connect(alice).claim([H1], [PRICE], [3], expiry, sig, { value: PRICE });
    const sig2 = await quote(keeper, alice.address, [H1], [PRICE], [3], expiry + 1);
    await expect(
      tiles.connect(alice).claim([H1], [PRICE], [3], expiry + 1, sig2, { value: PRICE }),
    ).to.be.revertedWithCustomError(tiles, "AlreadyClaimed");
  });

  it("embed locks VAVA and reimburses the keeper the escrow", async () => {
    const { tiles, alice, keeper, quote, now } = await deploy();
    const expiry = (await now()) + 300;
    const sig = await quote(keeper, alice.address, [H1], [PRICE], [3], expiry);
    await tiles.connect(alice).claim([H1], [PRICE], [3], expiry, sig, { value: PRICE });

    const escrow = (PRICE * 1500n) / 10000n;
    const kBefore = await ethers.provider.getBalance(keeper.address);
    const tx = await tiles.connect(keeper).embed([H1], [5_000_000n]);
    const rc = await tx.wait();
    const gas = rc!.gasUsed * rc!.gasPrice;
    const kAfter = await ethers.provider.getBalance(keeper.address);

    expect(kAfter - kBefore + gas).to.equal(escrow);
    expect((await tiles.hexes(H1)).embeddedVava).to.equal(5_000_000n);
    expect((await tiles.hexes(H1)).pendingWei).to.equal(0);
    expect(await tiles.totalPendingWei()).to.equal(0);
  });

  it("raze pays embedded VAVA minus 10% burn", async () => {
    const { tiles, vava, alice, keeper, quote, now } = await deploy();
    const expiry = (await now()) + 300;
    const sig = await quote(keeper, alice.address, [H1], [PRICE], [1], expiry);
    await tiles.connect(alice).claim([H1], [PRICE], [1], expiry, sig, { value: PRICE });
    await tiles.connect(keeper).embed([H1], [10_000_000n]);

    const before = await vava.balanceOf(alice.address);
    await tiles.connect(alice).raze(H1);
    expect((await vava.balanceOf(alice.address)) - before).to.equal(9_000_000n);
    expect(await vava.balanceOf("0x000000000000000000000000000000000000dEaD")).to.equal(1_000_000n);
    expect((await tiles.hexes(H1)).owner).to.equal(ethers.ZeroAddress);
    expect(await tiles.tierCounts(0)).to.equal(0);
  });

  it("atomic listing buy flips owner and pays seller minus 5%", async () => {
    const { tiles, alice, bob, treasury, keeper, quote, now } = await deploy();
    const expiry = (await now()) + 300;
    const sig = await quote(keeper, alice.address, [H1], [PRICE], [3], expiry);
    await tiles.connect(alice).claim([H1], [PRICE], [3], expiry, sig, { value: PRICE });

    const ask = ethers.parseEther("0.05");
    await tiles.connect(alice).list(H1, ask);
    const aBefore = await ethers.provider.getBalance(alice.address);
    const tBefore = await ethers.provider.getBalance(treasury.address);
    await tiles.connect(bob).buy(H1, { value: ask });

    expect((await tiles.hexes(H1)).owner).to.equal(bob.address);
    expect(await tiles.listings(H1)).to.equal(0);
    expect((await ethers.provider.getBalance(alice.address)) - aBefore).to.equal((ask * 9500n) / 10000n);
    expect((await ethers.provider.getBalance(treasury.address)) - tBefore).to.equal((ask * 500n) / 10000n);
  });

  it("bid escrow: place -> decline refunds; place -> accept flips at 95/5", async () => {
    const { tiles, alice, bob, keeper, quote, now } = await deploy();
    const expiry = (await now()) + 300;
    const sig = await quote(keeper, alice.address, [H1], [PRICE], [3], expiry);
    await tiles.connect(alice).claim([H1], [PRICE], [3], expiry, sig, { value: PRICE });

    const bid = ethers.parseEther("0.02");
    await tiles.connect(bob).placeBid(H1, { value: bid });
    const bBefore = await ethers.provider.getBalance(bob.address);
    await tiles.connect(alice).declineBid(H1);
    expect((await ethers.provider.getBalance(bob.address)) - bBefore).to.equal(bid);

    await tiles.connect(bob).placeBid(H1, { value: bid });
    const aBefore = await ethers.provider.getBalance(alice.address);
    const tx = await tiles.connect(alice).acceptBid(H1);
    const rc = await tx.wait();
    const gas = rc!.gasUsed * rc!.gasPrice;
    expect((await tiles.hexes(H1)).owner).to.equal(bob.address);
    expect((await ethers.provider.getBalance(alice.address)) - aBefore + gas).to.equal(
      (bid * 9500n) / 10000n,
    );
  });

  it("baron staker pays 3% seller fee instead of 5%", async () => {
    const { tiles, vava, alice, bob, keeper, quote, now } = await deploy();
    await tiles.connect(alice).stake(500_000_000_000n); // 500k VAVA = baron
    const expiry = (await now()) + 300;
    const sig = await quote(keeper, alice.address, [H1], [PRICE], [3], expiry);
    await tiles.connect(alice).claim([H1], [PRICE], [3], expiry, sig, { value: PRICE });
    const ask = ethers.parseEther("0.1");
    await tiles.connect(alice).list(H1, ask);
    const aBefore = await ethers.provider.getBalance(alice.address);
    await tiles.connect(bob).buy(H1, { value: ask });
    expect((await ethers.provider.getBalance(alice.address)) - aBefore).to.equal((ask * 9700n) / 10000n);
  });

  it("unstake cooldown gates withdrawal for 24h and resets on new begin", async () => {
    const { tiles, vava, alice } = await deploy();
    await tiles.connect(alice).stake(1_000_000n);
    await tiles.connect(alice).beginUnstake(600_000n);
    await expect(tiles.connect(alice).withdrawUnstaked()).to.be.revertedWithCustomError(
      tiles,
      "CooldownActive",
    );
    await ethers.provider.send("evm_increaseTime", [80_000]);
    await ethers.provider.send("evm_mine", []);
    // new beginUnstake resets the clock for the WHOLE pending amount
    await tiles.connect(alice).beginUnstake(400_000n);
    await expect(tiles.connect(alice).withdrawUnstaked()).to.be.revertedWithCustomError(
      tiles,
      "CooldownActive",
    );
    await ethers.provider.send("evm_increaseTime", [86_401]);
    await ethers.provider.send("evm_mine", []);
    const before = await vava.balanceOf(alice.address);
    await tiles.connect(alice).withdrawUnstaked();
    expect((await vava.balanceOf(alice.address)) - before).to.equal(1_000_000n);
  });

  it("mint swap: refuses while vault holds tokens, works when drained, locks forever", async () => {
    const { tiles, vava, admin, alice, keeper, quote, now } = await deploy();
    const expiry = (await now()) + 300;
    const sig = await quote(keeper, alice.address, [H1], [PRICE], [3], expiry);
    await tiles.connect(alice).claim([H1], [PRICE], [3], expiry, sig, { value: PRICE });
    await tiles.connect(keeper).embed([H1], [1_000_000n]);

    const Vava2 = await ethers.getContractFactory("MockVava");
    const vava2 = await Vava2.deploy();
    await expect(
      tiles.connect(admin).updateMint(await vava2.getAddress()),
    ).to.be.revertedWithCustomError(tiles, "VaultNotEmpty");

    await tiles.connect(alice).raze(H1); // drains the vault
    await tiles.connect(admin).updateMint(await vava2.getAddress());
    await tiles.connect(admin).lockMint();
    await expect(
      tiles.connect(admin).updateMint(await vava.getAddress()),
    ).to.be.revertedWithCustomError(tiles, "MintIsLocked");
  });

  it("large batch claim: gas per hex measured (200 under local 16.7M cap)", async () => {
    const { tiles, alice, keeper, quote, now } = await deploy();
    const h3s = Array.from({ length: 200 }, (_, i) => 0x8c0000000000000n + BigInt(i) * 2n);
    const prices = h3s.map(() => 10n ** 12n);
    const tiers = h3s.map(() => 3);
    const expiry = (await now()) + 600;
    const sig = await quote(keeper, alice.address, h3s, prices, tiers, expiry);
    const tx = await tiles
      .connect(alice)
      .claim(h3s, prices, tiers, expiry, sig, { value: 10n ** 12n * 200n, gasLimit: 16_000_000n });
    const rc = await tx.wait();
    expect((await tiles.hexes(h3s[199])).owner).to.equal(alice.address);
    console.log("      gas/hex:", (rc!.gasUsed / 200n).toString());
    expect(rc!.gasUsed).to.be.lessThan(16_000_000n);
  });
});
