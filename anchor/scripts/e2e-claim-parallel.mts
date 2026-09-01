/**
 * E2E for the PARALLEL batch-claim path (the >10-hex ClaimModal flow):
 * one /api/quote call for the whole basket -> N signed chunk quotes ->
 * N claim transactions signed at once and submitted in PARALLEL ->
 * every Tile PDA verified on-chain.
 *
 * Run: npx tsx anchor/scripts/e2e-claim-parallel.mts
 * Requires: next start on :3111 (for /api/quote) + funded devnet wallet.
 * Deliberately skips the Supabase mirror - chain-side proof only.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Connection, Keypair } from '@solana/web3.js';
import { latLngToCell } from 'h3-js';

process.env.NEXT_PUBLIC_TREASURY ??= '74fWA4NXGtv7RJEd9oTJk9vjqZCTMz2W1s5soCvC6b4X';

const { buildClaimTransaction, tilePda } = await import('../../lib/claim-chain');

const API = 'http://localhost:3111';
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
const kp = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(join(homedir(), '.config', 'solana', 'id.json'), 'utf-8'))),
);

// Deep Sahara, offset from every earlier test spot.
const BASE = { lat: 24.1173, lng: 6.2381 };
const COUNT = 25;
const h3s: string[] = [];
for (let i = 0; h3s.length < COUNT; i++) {
  const cell = latLngToCell(BASE.lat + Math.floor(i / 5) * 0.0002, BASE.lng + (i % 5) * 0.0002, 12);
  if (!h3s.includes(cell)) h3s.push(cell);
}
console.log(`basket: ${h3s.length} hexes`);

const t0 = Date.now();

// 1. ONE quote round for the whole basket
const qr = await fetch(`${API}/api/quote`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ h3s, claimer: kp.publicKey.toBase58() }),
});
const body = await qr.json();
if (!qr.ok) throw new Error('quote failed: ' + JSON.stringify(body));
const quotes = body.quotes;
if (!Array.isArray(quotes) || quotes.length !== Math.ceil(COUNT / 10)) {
  throw new Error(`expected ${Math.ceil(COUNT / 10)} chunk quotes, got ${quotes?.length}`);
}
console.log(`quoted in ${Date.now() - t0}ms: ${quotes.length} chunks, $${body.totalUsd.toFixed(4)} total`);

// 2. Build all txs on one blockhash, sign all, submit in PARALLEL
const { blockhash } = await conn.getLatestBlockhash('confirmed');
const txs = quotes.map((q: Parameters<typeof buildClaimTransaction>[0]) => {
  const { tx } = buildClaimTransaction(q, kp.publicKey);
  tx.feePayer = kp.publicKey;
  tx.recentBlockhash = blockhash;
  tx.sign(kp);
  return tx;
});

const tSubmit = Date.now();
const sigs = await Promise.all(
  txs.map(async (tx: (typeof txs)[number]) => {
    const sig = await conn.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    await conn.confirmTransaction(sig, 'confirmed');
    return sig;
  }),
);
console.log(`ALL ${sigs.length} txs confirmed in ${Date.now() - tSubmit}ms (parallel)`);

// 3. Verify every Tile PDA exists on-chain
const infos = await conn.getMultipleAccountsInfo(h3s.map((h) => tilePda(h)));
const missing = infos.filter((i) => !i).length;
if (missing > 0) throw new Error(`${missing}/${COUNT} tile PDAs missing on-chain`);
console.log(`VERIFIED: ${COUNT}/${COUNT} tile PDAs live on devnet`);
console.log(`TOTAL wall time: ${Date.now() - t0}ms`);
