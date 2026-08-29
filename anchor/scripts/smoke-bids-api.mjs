/**
 * E2E smoke for the bid system: on-chain escrow + API mirror + DB
 * notifications, against a running app server (http://localhost:3111)
 * and devnet. Claims a fresh hex, runs place/cancel/decline/accept with
 * mirror calls after each chain action, and verifies the mirrored
 * outcomes. Run from repo root: node anchor/scripts/smoke-bids-api.mjs
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

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3111';
const idl = JSON.parse(readFileSync(new URL('../../lib/anchor-idl.json', import.meta.url), 'utf-8'));
const programId = new PublicKey(idl.address);
const cli = Keypair.fromSecretKey(Uint8Array.from(
  JSON.parse(readFileSync(join(homedir(), '.config', 'solana', 'id.json'), 'utf-8')),
));
const keeper = Keypair.fromSecretKey(bs58.decode(
  readFileSync(new URL('../../.env.local', import.meta.url), 'utf-8').match(/KEEPER_SECRET_KEY=(.+)/)[1].trim(),
));
const connection = new Connection('https://api.devnet.solana.com', { commitment: 'confirmed' });
const TREASURY = new PublicKey('74fWA4NXGtv7RJEd9oTJk9vjqZCTMz2W1s5soCvC6b4X');

const seller = Keypair.generate();
const bidder = Keypair.generate();
const h3Hex = latLngToCell(-45.35 + Math.random() * 0.3, 168.5 + Math.random() * 0.3, 12);
const h3Id = new BN(h3Hex, 16);
const h3Le = h3Id.toArrayLike(Buffer, 'le', 8);
const tilePda = PublicKey.findProgramAddressSync([Buffer.from('tile'), h3Le], programId)[0];
const escrow = PublicKey.findProgramAddressSync(
  [Buffer.from('bid'), h3Le, bidder.publicKey.toBuffer()], programId)[0];
const cfg = PublicKey.findProgramAddressSync([Buffer.from('config')], programId)[0];
const stakePda = (o) => PublicKey.findProgramAddressSync([Buffer.from('stake'), o.toBuffer()], programId)[0];

console.log('hex', h3Hex, 'seller', seller.publicKey.toBase58(), 'bidder', bidder.publicKey.toBase58());

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : '  ' + detail}`);
  if (!ok) failures++;
};
const api = async (path, opts) => {
  const res = await fetch(`${BASE}${path}`, opts);
  return { status: res.status, json: await res.json().catch(() => ({})) };
};
const post = (path, body) => api(path, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const prog = (kp) => new Program(idl, new AnchorProvider(connection, new Wallet(kp), { commitment: 'confirmed' }));
const send = (tx, signers) => sendAndConfirmTransaction(connection, tx, signers, { commitment: 'confirmed' });

// ---- setup: fund + claim + DB hex row ----
await send(new Transaction()
  .add(SystemProgram.transfer({ fromPubkey: cli.publicKey, toPubkey: seller.publicKey, lamports: 60_000_000 }))
  .add(SystemProgram.transfer({ fromPubkey: cli.publicKey, toPubkey: bidder.publicKey, lamports: 60_000_000 })), [cli]);

{
  const price = 3_000_000n;
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 300);
  const msg = Buffer.concat([
    Buffer.from('VAVA_CLAIM_V1'), seller.publicKey.toBuffer(),
    (() => { const b = Buffer.alloc(8); b.writeBigInt64LE(expiry); return b; })(),
    h3Le,
    (() => { const b = Buffer.alloc(8); b.writeBigUInt64LE(price); return b; })(),
  ]);
  const hash = createHash('sha256').update(msg).digest();
  const edIx = Ed25519Program.createInstructionWithPublicKey({
    publicKey: keeper.publicKey.toBytes(), message: hash,
    signature: nacl.sign.detached(hash, keeper.secretKey),
  });
  const disc = Buffer.from(idl.instructions.find((i) => i.name === 'claim').discriminator);
  const data = Buffer.alloc(8 + 4 + 8 + 4 + 8 + 8);
  let o = 0;
  disc.copy(data, o); o += 8;
  data.writeUInt32LE(1, o); o += 4; h3Le.copy(data, o); o += 8;
  data.writeUInt32LE(1, o); o += 4; data.writeBigUInt64LE(price, o); o += 8;
  data.writeBigInt64LE(expiry, o);
  const counters = [1, 2, 3].map((t) =>
    PublicKey.findProgramAddressSync([Buffer.from('counter'), Buffer.from([t])], programId)[0]);
  const claimIx = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: seller.publicKey, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      { pubkey: cfg, isSigner: false, isWritable: false },
      { pubkey: PublicKey.findProgramAddressSync([Buffer.from('buyback')], programId)[0], isSigner: false, isWritable: true },
      { pubkey: counters[0], isSigner: false, isWritable: true },
      { pubkey: counters[1], isSigner: false, isWritable: true },
      { pubkey: counters[2], isSigner: false, isWritable: true },
      { pubkey: new PublicKey('Sysvar1nstructions1111111111111111111111111'), isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: tilePda, isSigner: false, isWritable: true },
    ],
    data,
  });
  await send(new Transaction().add(edIx)
    .add(ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 })).add(claimIx), [seller]);
  console.log('claimed on-chain; NOTE: DB hex row must be inserted by the runner (see stdout)');
  console.log(`DBROW ${h3Hex} ${seller.publicKey.toBase58()}`);
}

// Wait for the runner to insert the DB row if needed - poll /api/bids mirror readiness.
await new Promise((r) => setTimeout(r, Number(process.env.SMOKE_WAIT_MS ?? 15000)));

// ---- 1. place bid on-chain + mirror ----
let bidId;
{
  await prog(bidder).methods.placeBid(h3Id, new BN(10_000_000)).accounts({
    bidder: bidder.publicKey, tile: tilePda, bidEscrow: escrow,
  }).rpc();
  const m = await post('/api/bids', { h3: h3Hex, bidder: bidder.publicKey.toBase58() });
  check('mirror place: bid row created', m.status === 200 && m.json.bid?.status === 'active', JSON.stringify(m.json));
  bidId = m.json.bid?.id;

  const dup = await post('/api/bids', { h3: h3Hex, bidder: bidder.publicKey.toBase58() });
  check('mirror place: idempotent re-mirror', dup.status === 200 && dup.json.bid?.id === bidId, JSON.stringify(dup.json));

  const fake = await post('/api/bids', { h3: h3Hex, bidder: cli.publicKey.toBase58() });
  check('mirror place: no escrow -> rejected', fake.status === 404, JSON.stringify(fake.json));
}

// ---- 2. respond mirror refuses while escrow live ----
{
  const r = await post('/api/bids/respond', { bidId, txSig: 'x'.repeat(64) });
  check('respond: refuses while escrow live', r.status === 409, JSON.stringify(r.json));
}

// ---- 3. cancel on-chain + mirror ----
{
  const sig = await prog(bidder).methods.cancelBid(h3Id).accounts({
    bidder: bidder.publicKey, bidEscrow: escrow,
  }).rpc();
  const r = await post('/api/bids/respond', { bidId, txSig: sig });
  check('respond: cancel mirrored', r.status === 200 && r.json.outcome === 'cancelled', JSON.stringify(r.json));
}

// ---- 4. re-bid + decline ----
{
  await prog(bidder).methods.placeBid(h3Id, new BN(8_000_000)).accounts({
    bidder: bidder.publicKey, tile: tilePda, bidEscrow: escrow,
  }).rpc();
  const m = await post('/api/bids', { h3: h3Hex, bidder: bidder.publicKey.toBase58() });
  bidId = m.json.bid?.id;
  const sig = await prog(seller).methods.declineBid(h3Id).accounts({
    owner: seller.publicKey, tile: tilePda, bidder: bidder.publicKey, bidEscrow: escrow,
  }).rpc();
  const r = await post('/api/bids/respond', { bidId, txSig: sig });
  check('respond: decline mirrored', r.status === 200 && r.json.outcome === 'declined', JSON.stringify(r.json));
}

// ---- 5. re-bid + accept: full settlement ----
{
  await prog(bidder).methods.placeBid(h3Id, new BN(9_000_000)).accounts({
    bidder: bidder.publicKey, tile: tilePda, bidEscrow: escrow,
  }).rpc();
  const m = await post('/api/bids', { h3: h3Hex, bidder: bidder.publicKey.toBase58() });
  bidId = m.json.bid?.id;
  const sig = await prog(seller).methods.acceptBid(h3Id).accounts({
    owner: seller.publicKey, tile: tilePda, bidder: bidder.publicKey,
    bidEscrow: escrow, treasury: TREASURY, sellerStake: stakePda(seller.publicKey),
  }).rpc();
  const r = await post('/api/bids/respond', { bidId, txSig: sig });
  check('respond: accept -> settled sale', r.status === 200 && r.json.outcome === 'accepted', JSON.stringify(r.json));
  check('respond: sale fee 500 bps', r.json.sale?.fee_bps === 500, JSON.stringify(r.json.sale));
  const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf-8');
  const sbUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim();
  const sbKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)[1].trim();
  const row = await fetch(`${sbUrl}/rest/v1/hexes?h3_id=eq.${h3Hex}&select=owner`, {
    headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
  }).then((r) => r.json());
  check('DB owner flipped to bidder',
    row?.[0]?.owner === bidder.publicKey.toBase58(), JSON.stringify(row));
}

// ---- sweep ----
for (const kp of [seller, bidder]) {
  const b = await connection.getBalance(kp.publicKey);
  if (b > 10_000) {
    try {
      await send(new Transaction().add(SystemProgram.transfer({
        fromPubkey: kp.publicKey, toPubkey: cli.publicKey, lamports: b - 6_000,
      })), [kp]);
    } catch { /* dust */ }
  }
}
console.log(`CLEANUP ${h3Hex}`);
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
