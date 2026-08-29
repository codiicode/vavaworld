/**
 * Devnet buyback keeper: converts every tile's escrowed pending_sol into
 * embedded test-$VAVA via the program's `embed` instruction.
 *
 * On mainnet this bot market-buys $VAVA (Jupiter TWAP) with its own funds
 * and is reimbursed the escrowed SOL. On devnet there is no market, so the
 * "buy" uses a fixed reference price (VAVA_USD below) against the live
 * SOL/USD rate - the on-chain mechanics (tokens keeper→vault, SOL
 * escrow→keeper, tile credited) are identical.
 *
 * Usage: node scripts/keeper-embed.mjs
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction,
} from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN, BorshAccountsCoder } from '@coral-xyz/anchor';

const VAVA_USD = 0.0001; // devnet reference price ($100k FDV on 1B supply)

const idl = JSON.parse(readFileSync(new URL('../../lib/anchor-idl.json', import.meta.url), 'utf-8'));
const programId = new PublicKey(idl.address);
const MINT = new PublicKey('4ZoSV4L942MANHBL5Y7hVvR3LeXjM8xXfHuhZaKKGCZa');
const TOKEN = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA_PROG = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
const funder = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(
  readFileSync(join(homedir(), '.config', 'solana', 'id.json'), 'utf-8'))));
const keeper = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(
  readFileSync(new URL('../keeper-keypair.json', import.meta.url), 'utf-8'))));

const ata = (owner) => PublicKey.findProgramAddressSync(
  [owner.toBuffer(), TOKEN.toBuffer(), MINT.toBuffer()], ATA_PROG)[0];

const solUsd = await fetch('https://vavaworld.vercel.app/api/sol-price')
  .then((r) => r.json()).then((j) => j.solUsd).catch(() => 105);
console.log('SOL/USD:', solUsd, '| devnet VAVA/USD:', VAVA_USD);

// ── 1. Ensure keeper is funded (fees) and holds test-VAVA ──
const keeperSol = await conn.getBalance(keeper.publicKey);
const funderAta = ata(funder.publicKey);
const keeperAta = ata(keeper.publicKey);

const setup = new Transaction();
if (keeperSol < 10_000_000) {
  setup.add(SystemProgram.transfer({
    fromPubkey: funder.publicKey, toPubkey: keeper.publicKey, lamports: 30_000_000,
  }));
}
const keeperAtaInfo = await conn.getAccountInfo(keeperAta);
if (!keeperAtaInfo) {
  // create ATA (payer funder, owner keeper)
  setup.add({
    programId: ATA_PROG,
    keys: [
      { pubkey: funder.publicKey, isSigner: true, isWritable: true },
      { pubkey: keeperAta, isSigner: false, isWritable: true },
      { pubkey: keeper.publicKey, isSigner: false, isWritable: false },
      { pubkey: MINT, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([]),
  });
}
if (setup.instructions.length > 0) {
  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  setup.feePayer = funder.publicKey;
  setup.recentBlockhash = blockhash;
  setup.sign(funder);
  const s = await conn.sendRawTransaction(setup.serialize());
  await conn.confirmTransaction(s, 'confirmed');
  console.log('keeper funded/ATA created:', s);
}

// Top up keeper's token balance (10,000 VAVA covers a lot of embeds)
const kBal = await conn.getTokenAccountBalance(keeperAta).then((b) => Number(b.value.amount)).catch(() => 0);
if (kBal < 1_000_000_000) {
  const ix = {
    programId: TOKEN,
    keys: [
      { pubkey: funderAta, isSigner: false, isWritable: true },
      { pubkey: keeperAta, isSigner: false, isWritable: true },
      { pubkey: funder.publicKey, isSigner: true, isWritable: false },
    ],
    data: Buffer.concat([Buffer.from([3]), (() => { const b = Buffer.alloc(8); b.writeBigUInt64LE(10_000_000_000n); return b; })()]),
  };
  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  const tx = new Transaction().add(ix);
  tx.feePayer = funder.publicKey;
  tx.recentBlockhash = blockhash;
  tx.sign(funder);
  const s = await conn.sendRawTransaction(tx.serialize());
  await conn.confirmTransaction(s, 'confirmed');
  console.log('sent 10,000 test-VAVA to keeper:', s);
}

// ── 2. Scan for tiles with pending SOL ──
const coder = new BorshAccountsCoder(idl);
const accs = await conn.getProgramAccounts(programId, { filters: [{ dataSize: 82 }] });
const pendingTiles = [];
for (const a of accs) {
  try {
    const t = coder.decode('Tile', a.account.data);
    const pending = BigInt(t.pending_sol?.toString?.() ?? t.pendingSol.toString());
    if (pending > 0n) pendingTiles.push({ pda: a.pubkey, tile: t, pending });
  } catch { /* not a v2 tile */ }
}
console.log('tiles with pending SOL:', pendingTiles.length);
if (pendingTiles.length === 0) { console.log('nothing to embed'); process.exit(0); }

// ── 3. Embed each ──
const provider = new AnchorProvider(conn, new Wallet(keeper), { commitment: 'confirmed' });
const program = new Program(idl, provider);
const [config] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
const [buybackVault] = PublicKey.findProgramAddressSync([Buffer.from('buyback')], programId);
const [vavaVault] = PublicKey.findProgramAddressSync([Buffer.from('vault'), MINT.toBuffer()], programId);

const vaultBefore = await conn.getTokenAccountBalance(vavaVault).then((b) => Number(b.value.amount));
const escrowBefore = await conn.getBalance(buybackVault);

for (const { pda, tile, pending } of pendingTiles) {
  // pending lamports -> USD -> VAVA base units (6 decimals)
  const usd = (Number(pending) / 1e9) * solUsd;
  const vavaAmount = new BN(Math.max(1, Math.round((usd / VAVA_USD) * 1e6)));
  const sig = await program.methods
    .embed(vavaAmount)
    .accounts({
      keeper: keeper.publicKey,
      config,
      tile: pda,
      buybackVault,
      keeperToken: keeperAta,
      vavaVault,
    })
    .rpc();
  console.log(`embed ${tile.h3_id ?? tile.h3Id}: ${vavaAmount.toString()} base units (${(vavaAmount.toNumber() / 1e6).toFixed(2)} VAVA) sig=${sig.slice(0, 20)}…`);
}

// ── 4. Verify ──
const vaultAfter = await conn.getTokenAccountBalance(vavaVault).then((b) => Number(b.value.amount));
const escrowAfter = await conn.getBalance(buybackVault);
console.log('vault VAVA delta:', (vaultAfter - vaultBefore) / 1e6, 'VAVA');
console.log('escrow SOL delta:', (escrowAfter - escrowBefore) / 1e9, 'SOL (reimbursed to keeper)');

for (const { pda } of pendingTiles) {
  const info = await conn.getAccountInfo(pda);
  const t = coder.decode('Tile', info.data);
  const pend = BigInt(t.pending_sol?.toString?.() ?? t.pendingSol.toString());
  const emb = BigInt(t.embedded_vava?.toString?.() ?? t.embeddedVava.toString());
  if (pend !== 0n || emb === 0n) throw new Error('tile not settled: ' + pda.toBase58());
  console.log(`tile ${pda.toBase58().slice(0, 8)}…: pending=0, embedded=${Number(emb) / 1e6} VAVA ✓`);
}

console.log('\nKEEPER EMBED: ALL TILES SETTLED');
process.exit(0);
