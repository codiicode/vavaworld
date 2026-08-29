/**
 * Devnet smoke test for the on-chain bid escrow market:
 *   1. seller claims a fresh T3 hex (keeper-signed quote)
 *   2. bidder places a bid - SOL locked in the escrow PDA
 *   3. re-bid lower - difference refunded
 *   4. cancel - full refund
 *   5. re-bid + decline (seller) - full refund
 *   6. re-bid + accept (seller) - 95/5 split, tile flips to bidder, rent back
 *   7. keeper sync_owner - flips ownership (listing-sale consistency path)
 *   8. negative: self-bid, foreign accept/decline all rejected
 * Run: node anchor/scripts/smoke-bid-escrow.mjs   (from repo root)
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  Connection, Keypair, PublicKey, Transaction, TransactionInstruction,
  SystemProgram, Ed25519Program, ComputeBudgetProgram, sendAndConfirmTransaction,
} from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor';
import { latLngToCell } from 'h3-js';
import nacl from 'tweetnacl';
import bs58pkg from 'bs58';
const bs58 = bs58pkg.default ?? bs58pkg;

const idl = JSON.parse(readFileSync(new URL('../../lib/anchor-idl.json', import.meta.url), 'utf-8'));
const programId = new PublicKey(idl.address);
const cli = Keypair.fromSecretKey(Uint8Array.from(
  JSON.parse(readFileSync(join(homedir(), '.config', 'solana', 'id.json'), 'utf-8')),
));
const keeperSecret = readFileSync(new URL('../../.env.local', import.meta.url), 'utf-8')
  .match(/KEEPER_SECRET_KEY=(.+)/)[1].trim();
const keeper = Keypair.fromSecretKey(bs58.decode(keeperSecret));

const connection = new Connection('https://api.devnet.solana.com', { commitment: 'confirmed' });
const TREASURY = new PublicKey('74fWA4NXGtv7RJEd9oTJk9vjqZCTMz2W1s5soCvC6b4X');

const seller = Keypair.generate();
const bidder = Keypair.generate();
console.log('seller:', seller.publicKey.toBase58());
console.log('bidder:', bidder.publicKey.toBase58());

const pdas = {
  config: PublicKey.findProgramAddressSync([Buffer.from('config')], programId)[0],
  buyback: PublicKey.findProgramAddressSync([Buffer.from('buyback')], programId)[0],
  counter: (t) => PublicKey.findProgramAddressSync([Buffer.from('counter'), Buffer.from([t])], programId)[0],
  stake: (owner) => PublicKey.findProgramAddressSync([Buffer.from('stake'), owner.toBuffer()], programId)[0],
};

const h3Hex = latLngToCell(-45.4 + Math.random() * 0.3, 168.3 + Math.random() * 0.3, 12);
const h3Id = new BN(h3Hex, 16);
const h3Le = h3Id.toArrayLike(Buffer, 'le', 8);
const tilePda = PublicKey.findProgramAddressSync([Buffer.from('tile'), h3Le], programId)[0];
const escrowPda = (who) =>
  PublicKey.findProgramAddressSync([Buffer.from('bid'), h3Le, who.toBuffer()], programId)[0];
console.log('hex', h3Hex, '→ tile', tilePda.toBase58());

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : '  ' + detail}`);
  if (!ok) failures++;
};
const bal = (pk) => connection.getBalance(pk);
const send = (tx, signers) => sendAndConfirmTransaction(connection, tx, signers, { commitment: 'confirmed' });

// Program for each signer
const prog = (kp) =>
  new Program(idl, new AnchorProvider(connection, new Wallet(kp), { commitment: 'confirmed' }));

// ---- fund throwaways ----
{
  const tx = new Transaction()
    .add(SystemProgram.transfer({ fromPubkey: cli.publicKey, toPubkey: seller.publicKey, lamports: 60_000_000 }))
    .add(SystemProgram.transfer({ fromPubkey: cli.publicKey, toPubkey: bidder.publicKey, lamports: 60_000_000 }));
  await send(tx, [cli]);
  console.log('funded seller + bidder with 0.06 SOL each');
}

// ---- 1. seller claims the hex (keeper-signed quote) ----
{
  const price = 3_000_000n;
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 300);
  const msg = Buffer.concat([
    Buffer.from('VAVA_CLAIM_V1'),
    seller.publicKey.toBuffer(),
    (() => { const b = Buffer.alloc(8); b.writeBigInt64LE(expiry); return b; })(),
    h3Le,
    (() => { const b = Buffer.alloc(8); b.writeBigUInt64LE(price); return b; })(),
  ]);
  const hash = createHash('sha256').update(msg).digest();
  const sig = nacl.sign.detached(hash, keeper.secretKey);
  const edIx = Ed25519Program.createInstructionWithPublicKey({
    publicKey: keeper.publicKey.toBytes(), message: hash, signature: sig,
  });
  const disc = Buffer.from(idl.instructions.find((i) => i.name === 'claim').discriminator);
  const data = Buffer.alloc(8 + 4 + 8 + 4 + 8 + 8);
  let o = 0;
  disc.copy(data, o); o += 8;
  data.writeUInt32LE(1, o); o += 4; h3Le.copy(data, o); o += 8;
  data.writeUInt32LE(1, o); o += 4; data.writeBigUInt64LE(price, o); o += 8;
  data.writeBigInt64LE(expiry, o);
  const claimIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: seller.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: pdas.config, isSigner: false, isWritable: false },
      { pubkey: pdas.buyback, isSigner: false, isWritable: true },
      { pubkey: pdas.counter(1), isSigner: false, isWritable: true },
      { pubkey: pdas.counter(2), isSigner: false, isWritable: true },
      { pubkey: pdas.counter(3), isSigner: false, isWritable: true },
      { pubkey: new PublicKey('Sysvar1nstructions1111111111111111111111111'), isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: tilePda, isSigner: false, isWritable: true },
    ],
    data,
  });
  const tx = new Transaction()
    .add(edIx)
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }))
    .add(claimIx);
  await send(tx, [seller]);
  const tile = await prog(seller).account.tile.fetch(tilePda);
  check('claim: tile owned by seller', tile.owner.equals(seller.publicKey));
}

const BID = 10_000_000; // 0.01 SOL
const escrow = escrowPda(bidder.publicKey);

// ---- 2. place bid: SOL locked ----
{
  const bidderBefore = await bal(bidder.publicKey);
  await prog(bidder).methods.placeBid(h3Id, new BN(BID)).accounts({
    bidder: bidder.publicKey, tile: tilePda, bidEscrow: escrow,
  }).rpc();
  const escrowBal = await bal(escrow);
  const bidderAfter = await bal(bidder.publicKey);
  check('place_bid: escrow holds bid + rent', escrowBal > BID, `escrow=${escrowBal}`);
  check('place_bid: bidder debited', bidderBefore - bidderAfter >= BID, `delta=${bidderBefore - bidderAfter}`);
}

// ---- 3. re-bid lower: difference refunded ----
{
  const before = await bal(escrow);
  await prog(bidder).methods.placeBid(h3Id, new BN(BID - 4_000_000)).accounts({
    bidder: bidder.publicKey, tile: tilePda, bidEscrow: escrow,
  }).rpc();
  const after = await bal(escrow);
  check('re-bid lower: escrow refunds diff', before - after === 4_000_000, `delta=${before - after}`);
}

// ---- 4. cancel: full refund ----
{
  const bidderBefore = await bal(bidder.publicKey);
  await prog(bidder).methods.cancelBid(h3Id).accounts({
    bidder: bidder.publicKey, bidEscrow: escrow,
  }).rpc();
  const gone = (await connection.getAccountInfo(escrow)) === null;
  const bidderAfter = await bal(bidder.publicKey);
  check('cancel_bid: escrow closed', gone);
  check('cancel_bid: bidder refunded', bidderAfter - bidderBefore > 6_000_000, `delta=${bidderAfter - bidderBefore}`);
}

// ---- negative: self-bid rejected ----
{
  let rejected = false;
  try {
    await prog(seller).methods.placeBid(h3Id, new BN(1_000_000)).accounts({
      bidder: seller.publicKey, tile: tilePda, bidEscrow: escrowPda(seller.publicKey),
    }).rpc();
  } catch { rejected = true; }
  check('self-bid rejected', rejected);
}

// ---- 5. re-bid + decline ----
{
  await prog(bidder).methods.placeBid(h3Id, new BN(BID)).accounts({
    bidder: bidder.publicKey, tile: tilePda, bidEscrow: escrow,
  }).rpc();

  // negative: bidder cannot decline/accept (not the owner)
  let rejected = false;
  try {
    await prog(bidder).methods.acceptBid(h3Id).accounts({
      owner: bidder.publicKey, tile: tilePda, bidder: bidder.publicKey,
      bidEscrow: escrow, treasury: TREASURY, sellerStake: pdas.stake(bidder.publicKey),
    }).rpc();
  } catch { rejected = true; }
  check('foreign accept rejected', rejected);

  const bidderBefore = await bal(bidder.publicKey);
  await prog(seller).methods.declineBid(h3Id).accounts({
    owner: seller.publicKey, tile: tilePda, bidder: bidder.publicKey, bidEscrow: escrow,
  }).rpc();
  const gone = (await connection.getAccountInfo(escrow)) === null;
  const bidderAfter = await bal(bidder.publicKey);
  check('decline_bid: escrow closed', gone);
  check('decline_bid: bidder refunded', bidderAfter - bidderBefore > BID, `delta=${bidderAfter - bidderBefore}`);
}

// ---- 6. re-bid + accept: atomic settlement ----
{
  await prog(bidder).methods.placeBid(h3Id, new BN(BID)).accounts({
    bidder: bidder.publicKey, tile: tilePda, bidEscrow: escrow,
  }).rpc();
  const sellerBefore = await bal(seller.publicKey);
  const treasuryBefore = await bal(TREASURY);
  const bidderBefore = await bal(bidder.publicKey);

  await prog(seller).methods.acceptBid(h3Id).accounts({
    owner: seller.publicKey, tile: tilePda, bidder: bidder.publicKey,
    bidEscrow: escrow, treasury: TREASURY, sellerStake: pdas.stake(seller.publicKey),
  }).rpc();

  const sellerAfter = await bal(seller.publicKey);
  const treasuryAfter = await bal(TREASURY);
  const bidderAfter = await bal(bidder.publicKey);
  const tile = await prog(seller).account.tile.fetch(tilePda);
  const gone = (await connection.getAccountInfo(escrow)) === null;

  const expectedFee = Math.floor((BID * 500) / 10_000);      // 5% standard
  const expectedSeller = BID - expectedFee;                  // 95%
  check('accept: tile flipped to bidder', tile.owner.equals(bidder.publicKey));
  check('accept: escrow closed', gone);
  check('accept: seller +95% (minus tx fee)',
    sellerAfter - sellerBefore === expectedSeller - 5000,
    `delta=${sellerAfter - sellerBefore} expected=${expectedSeller - 5000}`);
  check('accept: treasury +5% fee', treasuryAfter - treasuryBefore === expectedFee,
    `delta=${treasuryAfter - treasuryBefore} expected=${expectedFee}`);
  check('accept: bidder got escrow rent back', bidderAfter - bidderBefore > 0,
    `delta=${bidderAfter - bidderBefore}`);
}

// ---- 7. keeper sync_owner ----
{
  await prog(keeper).methods.syncOwner(h3Id, seller.publicKey).accounts({
    keeper: keeper.publicKey, config: pdas.config, tile: tilePda,
  }).rpc();
  const tile = await prog(seller).account.tile.fetch(tilePda);
  check('sync_owner: keeper flipped owner back to seller', tile.owner.equals(seller.publicKey));

  // negative: non-keeper rejected
  let rejected = false;
  try {
    await prog(bidder).methods.syncOwner(h3Id, bidder.publicKey).accounts({
      keeper: bidder.publicKey, config: pdas.config, tile: tilePda,
    }).rpc();
  } catch { rejected = true; }
  check('sync_owner: non-keeper rejected', rejected);
}

// ---- sweep leftovers back to CLI wallet ----
{
  for (const kp of [seller, bidder]) {
    const b = await bal(kp.publicKey);
    if (b > 10_000) {
      const tx = new Transaction().add(SystemProgram.transfer({
        fromPubkey: kp.publicKey, toPubkey: cli.publicKey, lamports: b - 6_000,
      }));
      try { await send(tx, [kp]); } catch { /* dust */ }
    }
  }
  console.log('swept leftovers back to CLI wallet');
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
