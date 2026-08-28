/**
 * End-to-end secondary-market smoke test against a local next server
 * (http://localhost:3111) + devnet + the real Supabase:
 *   1. claim a fresh hex as the CLI wallet (real /api/claim flow)
 *   2. list it (createListing path, own hex, own signature domain)
 *   3. fund a fresh throwaway buyer wallet with devnet SOL
 *   4. GET /api/buy quote → build the split tx → pay → POST settle
 *   5. verify: owner flipped, listing sold, sale row recorded
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { latLngToCell } from 'h3-js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const API = 'http://localhost:3111';
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
// CLI wallet is the TREASURY - the seller must be a separate wallet or
// the payment-verification (treasury balance delta) nets to zero.
const cli = Keypair.fromSecretKey(Uint8Array.from(
  JSON.parse(readFileSync(join(homedir(), '.config', 'solana', 'id.json'), 'utf-8')),
));
const seller = Keypair.generate();
const addr = () => seller.publicKey.toBase58();
{
  const fund = new Transaction().add(SystemProgram.transfer({
    fromPubkey: cli.publicKey, toPubkey: seller.publicKey, lamports: 50_000_000,
  }));
  await sendAndConfirmTransaction(connection, fund, [cli]);
  console.log('seller funded ✓', addr());
}

// 1. claim a fresh remote hex as seller (pay quote in SOL to treasury, then commit)
const lat = -44.9 + Math.random() * 0.3;
const lng = 169.1 + Math.random() * 0.3;
const h3 = latLngToCell(lat, lng, 12);
console.log('hex:', h3);

const floorRes = await fetch(`${API}/api/hex-floor?h3=${h3}`).then((r) => r.json());
console.log('floor:', floorRes.currentFloor, 'USD, country', floorRes.countryIso);

// Payment: claims are SOL to treasury at the LIVE Pyth rate (server
// verifies the paid USD against the same rate).
const { solUsd } = await fetch(`${API}/api/sol-price`).then((r) => r.json());
const priceUsd = floorRes.currentFloor;
const lamports = Math.max(1, Math.round((priceUsd / solUsd) * 1e9 * 1.03));
const TREASURY = new PublicKey('74fWA4NXGtv7RJEd9oTJk9vjqZCTMz2W1s5soCvC6b4X');
const payTx = new Transaction().add(SystemProgram.transfer({
  fromPubkey: seller.publicKey, toPubkey: TREASURY, lamports,
}));
const paySig = await sendAndConfirmTransaction(connection, payTx, [seller]);

const claimRes = await fetch(`${API}/api/claim`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    h3, owner: seller.publicKey.toBase58(), txHash: paySig, quotedPriceUsd: priceUsd,
  }),
}).then((r) => r.json());
if (claimRes.error) throw new Error('claim failed: ' + claimRes.error);
console.log('claimed as seller ✓');

// 2. list it through the signed API (direct table writes are closed)
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const listMsg = `vava:list:${h3}:0.01:${addr()}:ts=${Date.now()}`;
const listSig = bs58.encode(nacl.sign.detached(new TextEncoder().encode(listMsg), seller.secretKey));
const listRes = await fetch(`${API}/api/list`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    h3, seller: addr(), priceSol: 0.01, message: listMsg, signature: listSig,
  }),
}).then((r) => r.json());
const listing = listRes.listing;
if (!listing?.id) throw new Error('listing failed: ' + JSON.stringify(listRes));
console.log('listed via signed API ✓', listing.id);

// negative: direct table insert must now be rejected (policies dropped)
const direct = await fetch(`${SUPA_URL}/rest/v1/listings`, {
  method: 'POST',
  headers: {
    apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`,
    'Content-Type': 'application/json', Prefer: 'return=representation',
  },
  body: JSON.stringify({ h3_id: h3, seller: addr(), price_sol: 0.01, status: 'active' }),
});
if (direct.ok) throw new Error('DIRECT LISTING INSERT SHOULD FAIL');
console.log('direct table insert rejected ✓');

// negative: direct claim_hex without the API secret must be rejected
const rpcDirect = await fetch(`${SUPA_URL}/rest/v1/rpc/claim_hex`, {
  method: 'POST',
  headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ p_h3: h3, p_country_iso: 'NZ', p_owner: addr(), p_tx_hash: 'x', p_quoted_price_usd: null, p_paid_usd: null, p_secret: 'wrong' }),
});
if (rpcDirect.ok) throw new Error('DIRECT claim_hex SHOULD FAIL');
console.log('direct claim_hex rejected ✓');

// 3. throwaway buyer funded from seller wallet
const buyer = Keypair.generate();
const fundTx = new Transaction().add(SystemProgram.transfer({
  fromPubkey: cli.publicKey, toPubkey: buyer.publicKey, lamports: 20_000_000,
}));
await sendAndConfirmTransaction(connection, fundTx, [cli]);
console.log('buyer funded ✓', buyer.publicKey.toBase58());

// 4. quote → pay → settle
const quote = await fetch(`${API}/api/buy?listingId=${listing.id}`).then((r) => r.json());
if (quote.error) throw new Error('quote failed: ' + quote.error);
console.log('quote: fee', quote.feeBps, 'bps; transfers:',
  quote.transfers.map((t) => `${t.label}=${t.lamports}`).join(' '));

const buyTx = new Transaction();
for (const t of quote.transfers) {
  if (t.lamports > 0) {
    buyTx.add(SystemProgram.transfer({
      fromPubkey: buyer.publicKey, toPubkey: new PublicKey(t.to), lamports: t.lamports,
    }));
  }
}
const buySig = await sendAndConfirmTransaction(connection, buyTx, [buyer]);
console.log('paid ✓', buySig.slice(0, 20) + '…');

const settle = await fetch(`${API}/api/buy`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ listingId: listing.id, buyer: buyer.publicKey.toBase58(), txSig: buySig }),
}).then((r) => r.json());
if (!settle.ok) throw new Error('settle failed: ' + JSON.stringify(settle));
console.log('settled ✓ sale id', settle.sale.id);

// 5. verify
const hex = await fetch(
  `${SUPA_URL}/rest/v1/hexes?h3_id=eq.${h3}&select=owner`,
  { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } },
).then((r) => r.json());
if (hex[0]?.owner !== buyer.publicKey.toBase58()) throw new Error('OWNER NOT FLIPPED');
console.log('owner flipped to buyer ✓');

// replay protection: settle again must fail
const replay = await fetch(`${API}/api/buy`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ listingId: listing.id, buyer: buyer.publicKey.toBase58(), txSig: buySig }),
}).then((r) => r.json());
if (replay.ok) throw new Error('REPLAY SHOULD FAIL');
console.log('replay rejected ✓ (' + replay.error + ')');

console.log('\nALL MARKET CHECKS PASSED');
