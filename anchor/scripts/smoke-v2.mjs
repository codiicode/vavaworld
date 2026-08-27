/**
 * Devnet smoke test for program v2:
 *   1. claim a remote T3 hex - verify the 85/15 split (treasury/escrow)
 *   2. embed as keeper - VAVA into the vault, escrowed SOL reimbursed
 *   3. raze as owner - 90% VAVA payout, 10% burned, tile closed
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor';
import { latLngToCell } from 'h3-js';

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const getAssociatedTokenAddressSync = (mint, owner) =>
  PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ATA_PROGRAM_ID,
  )[0];

const idl = JSON.parse(readFileSync(new URL('../../lib/anchor-idl.json', import.meta.url), 'utf-8'));
const programId = new PublicKey(idl.address);
const keypair = Keypair.fromSecretKey(Uint8Array.from(
  JSON.parse(readFileSync(join(homedir(), '.config', 'solana', 'id.json'), 'utf-8')),
));
const connection = new Connection('https://api.devnet.solana.com', { commitment: 'confirmed' });
const wallet = new Wallet(keypair);
const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
const program = new Program(idl, provider);

const MINT = new PublicKey('4ZoSV4L942MANHBL5Y7hVvR3LeXjM8xXfHuhZaKKGCZa');
const TREASURY = new PublicKey('74fWA4NXGtv7RJEd9oTJk9vjqZCTMz2W1s5soCvC6b4X');

const [config] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
const [buybackVault] = PublicKey.findProgramAddressSync([Buffer.from('buyback')], programId);
const [vavaVault] = PublicKey.findProgramAddressSync([Buffer.from('vault'), MINT.toBuffer()], programId);
const counters = [1, 2, 3].map(
  (t) => PublicKey.findProgramAddressSync([Buffer.from('counter'), Buffer.from([t])], programId)[0],
);

// Remote spot in the New Zealand wilderness - guaranteed T3, random jitter
// so re-runs hit a fresh cell.
const lat = -45.5 + Math.random() * 0.4;
const lng = 168.2 + Math.random() * 0.4;
const h3Hex = latLngToCell(lat, lng, 12);
const h3Id = new BN(h3Hex, 16);
const [tilePda] = PublicKey.findProgramAddressSync(
  [Buffer.from('tile'), h3Id.toArrayLike(Buffer, 'le', 8)],
  programId,
);
console.log('hex', h3Hex, '→ tile', tilePda.toBase58());

const lam = (x) => x / 1e9;
const balances = async () => ({
  buyback: await connection.getBalance(buybackVault),
  wallet: await connection.getBalance(wallet.publicKey),
});

// ---- 1. CLAIM ----
const before = await balances();
let sig = await program.methods
  .claim([h3Id], new BN(2_000_000))
  .accounts({
    claimer: wallet.publicKey,
    treasury: TREASURY,
    config,
    buybackVault,
    t1Counter: counters[0],
    t2Counter: counters[1],
    t3Counter: counters[2],
  })
  .remainingAccounts([{ pubkey: tilePda, isWritable: true, isSigner: false }])
  .rpc();
console.log('claim sig:', sig);

let tile = await program.account.tile.fetch(tilePda);
const after = await balances();
console.log('  price_paid   :', tile.pricePaid.toString(), 'lamports');
console.log('  pending_sol  :', tile.pendingSol.toString(), '(expect 15% of price)');
console.log('  embedded_vava:', tile.embeddedVava.toString(), '(expect 0)');
console.log('  escrow delta :', after.buyback - before.buyback, 'lamports');
if (tile.pendingSol.toNumber() !== Math.floor(tile.pricePaid.toNumber() * 0.15))
  throw new Error('SPLIT WRONG');
if (after.buyback - before.buyback !== tile.pendingSol.toNumber())
  throw new Error('ESCROW WRONG');

// ---- 2. EMBED (keeper) ----
// Devnet stand-in for the market swap: keeper "bought" VAVA at a fake
// rate of 1000 VAVA-base-units per lamport.
const keeperToken = getAssociatedTokenAddressSync(MINT, wallet.publicKey);
const vavaAmount = new BN(tile.pendingSol.toNumber() * 1000);
const escrowBefore = await connection.getBalance(buybackVault);
sig = await program.methods
  .embed(vavaAmount)
  .accounts({
    keeper: wallet.publicKey,
    config,
    tile: tilePda,
    buybackVault,
    keeperToken,
    vavaVault,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();
console.log('embed sig:', sig);
tile = await program.account.tile.fetch(tilePda);
const escrowAfter = await connection.getBalance(buybackVault);
console.log('  embedded_vava:', tile.embeddedVava.toString());
console.log('  pending_sol  :', tile.pendingSol.toString(), '(expect 0)');
console.log('  escrow drain :', escrowBefore - escrowAfter, 'lamports (reimbursed to keeper)');
if (tile.pendingSol.toNumber() !== 0) throw new Error('PENDING NOT CLEARED');
if (tile.embeddedVava.toString() !== vavaAmount.toString()) throw new Error('EMBED WRONG');

// ---- 3. RAZE (owner) ----
const supplyBefore = BigInt((await connection.getTokenSupply(MINT)).value.amount);
const ownerToken = keeperToken; // same wallet in the smoke test
const tokBefore = BigInt((await connection.getTokenAccountBalance(ownerToken)).value.amount);
sig = await program.methods
  .raze()
  .accounts({
    owner: wallet.publicKey,
    tile: tilePda,
    config,
    vavaMint: MINT,
    vavaVault,
    ownerToken,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();
console.log('raze sig:', sig);
const tokAfter = BigInt((await connection.getTokenAccountBalance(ownerToken)).value.amount);
const supplyAfter = BigInt((await connection.getTokenSupply(MINT)).value.amount);
const embedded = BigInt(vavaAmount.toString());
const expectedPayout = embedded - embedded / 10n;
console.log('  payout       :', (tokAfter - tokBefore).toString(), '(expect', expectedPayout.toString() + ')');
console.log('  burned       :', (supplyBefore - supplyAfter).toString(), '(expect', (embedded / 10n).toString() + ')');
const closed = await connection.getAccountInfo(tilePda);
console.log('  tile account :', closed === null ? 'CLOSED (land unclaimed again)' : 'STILL EXISTS?!');
if (tokAfter - tokBefore !== expectedPayout) throw new Error('PAYOUT WRONG');
if (supplyBefore - supplyAfter !== embedded / 10n) throw new Error('BURN WRONG');
if (closed !== null) throw new Error('TILE NOT CLOSED');

console.log('\nALL CHECKS PASSED');
