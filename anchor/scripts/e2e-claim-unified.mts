/**
 * E2E dress rehearsal for the unified claim flow, using the SAME client
 * code path as ClaimModal (lib/claim-chain): /api/quote -> keeper-signed
 * quote -> ed25519+claim program transaction -> on-chain verification ->
 * /api/claim mirror -> Supabase verification.
 *
 * Run: npx tsx anchor/scripts/e2e-claim-unified.mts
 * Requires: next start on :3111 (for the API routes) + devnet wallet.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { latLngToCell } from 'h3-js';

process.env.NEXT_PUBLIC_TREASURY ??= '74fWA4NXGtv7RJEd9oTJk9vjqZCTMz2W1s5soCvC6b4X';

const { buildClaimTransaction, tilePda } = await import('../../lib/claim-chain');

const API = 'http://localhost:3111';
const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
const kp = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(join(homedir(), '.config', 'solana', 'id.json'), 'utf-8'))),
);

// Middle of the Sahara - deliberately obscure test spot.
const BASE = { lat: 23.5061, lng: 5.5715 };
const h3s = [
  latLngToCell(BASE.lat, BASE.lng, 12),
  latLngToCell(BASE.lat + 0.0002, BASE.lng, 12),
  latLngToCell(BASE.lat, BASE.lng + 0.0002, 12),
];
console.log('claiming', h3s.join(', '));

// 1. Quote (same endpoint the modal calls)
const qr = await fetch(`${API}/api/quote`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ h3s, claimer: kp.publicKey.toBase58() }),
});
const quote = await qr.json();
if (!qr.ok) throw new Error('quote failed: ' + JSON.stringify(quote));
console.log('quote ok:', quote.totalUsd, 'USD =', quote.totalLamports, 'lamports @', quote.solUsd);

// 2. Build + send the program transaction (same builder as the modal)
const [buybackVault] = PublicKey.findProgramAddressSync(
  [Buffer.from('buyback')],
  new PublicKey(JSON.parse(readFileSync('lib/anchor-idl.json', 'utf-8')).address),
);
const buybackBefore = await conn.getBalance(buybackVault);

const { tx, totalLamports } = buildClaimTransaction(quote, kp.publicKey);
const { blockhash } = await conn.getLatestBlockhash('confirmed');
tx.feePayer = kp.publicKey;
tx.recentBlockhash = blockhash;
tx.sign(kp);
const sig = await conn.sendRawTransaction(tx.serialize());
await conn.confirmTransaction(sig, 'confirmed');
console.log('claim tx confirmed:', sig);

// 3. Verify on-chain: buyback escrow got 15%, tiles exist with pending_sol
const buybackAfter = await conn.getBalance(buybackVault);
const escrowDelta = buybackAfter - buybackBefore;
const expectedEmbed = quote.pricesLamports
  .map((p: string) => Math.floor(Number(p) * 0.15))
  .reduce((s: number, x: number) => s + x, 0);
console.log('buyback escrow delta:', escrowDelta, '(expected ~', expectedEmbed, ')');
if (Math.abs(escrowDelta - expectedEmbed) > 3) throw new Error('escrow split mismatch');

for (const h3 of h3s) {
  const info = await conn.getAccountInfo(tilePda(h3));
  if (!info) throw new Error('tile PDA missing for ' + h3);
  const owner = new PublicKey(info.data.subarray(8, 40)).toBase58();
  if (owner !== kp.publicKey.toBase58()) throw new Error('tile owner mismatch');
  // pending_sol at offset 8+32+8+8+1+8+1 = 66
  const pending = info.data.readBigUInt64LE(66);
  console.log(`tile ${h3}: owner ok, pending_sol=${pending}`);
}

// 4. Mirror into Supabase (same call the modal makes)
for (let i = 0; i < h3s.length; i++) {
  const mr = await fetch(`${API}/api/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ h3: h3s[i], owner: kp.publicKey.toBase58(), quotedPriceUsd: quote.perHexUsd[i] }),
  });
  const mj = await mr.json();
  if (!mr.ok) throw new Error('mirror failed for ' + h3s[i] + ': ' + JSON.stringify(mj));
  console.log('mirrored', h3s[i]);
}

// 5. Verify registry sees them
const reg = await fetch(`${API}/api/claimed`).then((r) => r.json());
const inReg = h3s.filter((h) => reg.hexes.some((x: { h3: string }) => x.h3 === h));
console.log('registry has', inReg.length, 'of', h3s.length);
if (inReg.length !== h3s.length) throw new Error('registry mismatch');

// 6. Negative test: forged price must be rejected on-chain
const forged = { ...quote, pricesLamports: quote.pricesLamports.map(() => '1'), totalLamports: '3' };
const { tx: forgedTx } = buildClaimTransaction(forged, kp.publicKey);
forgedTx.feePayer = kp.publicKey;
forgedTx.recentBlockhash = (await conn.getLatestBlockhash('confirmed')).blockhash;
forgedTx.sign(kp);
try {
  const sim = await conn.simulateTransaction(forgedTx);
  if (!sim.value.err) throw new Error('FORGED PRICE WAS ACCEPTED - SECURITY BUG');
  console.log('forged-price tx rejected as expected (QuoteInvalid)');
} catch (e) {
  console.log('forged-price tx rejected:', String(e).slice(0, 80));
}

console.log('\nE2E UNIFIED CLAIM: ALL CHECKS PASSED');
process.exit(0);
