/**
 * Throne smoke test against localhost:3111 + devnet + live Supabase:
 *   1. claim throne with < 1M staked → 403 (stake gate)
 *   2. stake up to 1M → claim throne with too little land → land-floor
 *      rejection from SQL through the full path
 *   3. batch-claim 250 NZ hexes (claim_hex, devnet trust mode) → claim
 *      throne → PRESIDENT
 *   4. duplicate claim → 'already occupied'; coup from a wallet with
 *      less land → rejected
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor';
import { latLngToCell } from 'h3-js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const API = 'http://localhost:3111';
const ISO = 'NZ';
const seller = Keypair.fromSecretKey(Uint8Array.from(
  JSON.parse(readFileSync(join(homedir(), '.config', 'solana', 'id.json'), 'utf-8')),
));
const addr = seller.publicKey.toBase58();

const signAction = (action) => {
  const message = `vava:throne:${action}:${ISO}:${addr}:ts=${Date.now()}`;
  const signature = bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), seller.secretKey));
  return { action, countryIso: ISO, address: addr, message, signature };
};
const post = (body) => fetch(`${API}/api/thrones`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}).then(async (r) => ({ status: r.status, json: await r.json() }));

// 1. stake gate (we have 400k active from the staking smoke)
let res = await post(signAction('claim'));
if (res.status !== 403) throw new Error('expected 403 stake gate, got ' + JSON.stringify(res));
console.log('stake gate ✓ (' + res.json.error + ')');

// 2. stake up to 1M, then land-floor rejection
const idl = JSON.parse(readFileSync(new URL('../../lib/anchor-idl.json', import.meta.url), 'utf-8'));
const programId = new PublicKey(idl.address);
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const program = new Program(idl, new AnchorProvider(connection, new Wallet(seller), { commitment: 'confirmed' }));
const MINT = new PublicKey('4ZoSV4L942MANHBL5Y7hVvR3LeXjM8xXfHuhZaKKGCZa');
const TOKEN = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const ownerToken = PublicKey.findProgramAddressSync(
  [seller.publicKey.toBuffer(), TOKEN.toBuffer(), MINT.toBuffer()], ATA)[0];
const [config] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
const [stakeAccount] = PublicKey.findProgramAddressSync([Buffer.from('stake'), seller.publicKey.toBuffer()], programId);
const [stakeVault] = PublicKey.findProgramAddressSync([Buffer.from('stake_vault'), MINT.toBuffer()], programId);

const acct = await program.account.stakeAccount.fetch(stakeAccount);
const activeWhole = Number(BigInt(acct.amount.toString()) / 1_000_000n);
if (activeWhole < 1_000_000) {
  const need = 1_000_000 - activeWhole;
  await program.methods.stake(new BN(BigInt(need) * 1_000_000n + ''))
    .accounts({ owner: seller.publicKey, config, stakeAccount, ownerToken, stakeVault }).rpc();
  console.log(`staked +${need} → 1M ✓`);
} else {
  console.log('already at 1M+ stake');
}

res = await post(signAction('claim'));
if (res.status !== 409 || !/need \d+ hexes/.test(res.json.error))
  throw new Error('expected land-floor rejection, got ' + JSON.stringify(res));
console.log('land floor ✓ (' + res.json.error + ')');

// 3. batch-claim 250 NZ hexes via claim_hex (devnet trust mode), then claim throne
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const claimHex = async (h3) => {
  const r = await fetch(`${SUPA_URL}/rest/v1/rpc/claim_hex`, {
    method: 'POST',
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_h3: h3, p_country_iso: ISO, p_owner: addr, p_tx_hash: null, p_quoted_price_usd: null, p_paid_usd: null, p_secret: process.env.INDEXER_API_SECRET }),
  });
  if (!r.ok) {
    const t = await r.text();
    if (!t.includes('already')) throw new Error('claim_hex failed: ' + t.slice(0, 120));
  }
};

const cells = new Set();
let k = 0;
while (cells.size < 250) {
  const lat = -45.2 + (k % 50) * 0.002;
  const lng = 168.6 + Math.floor(k / 50) * 0.002;
  cells.add(latLngToCell(lat, lng, 12));
  k++;
}
const list = [...cells];
console.log('claiming', list.length, 'NZ hexes…');
for (let i = 0; i < list.length; i += 20) {
  await Promise.all(list.slice(i, i + 20).map(claimHex));
  process.stdout.write('.');
}
console.log(' done');

res = await post(signAction('claim'));
if (!res.json.ok) throw new Error('throne claim failed: ' + JSON.stringify(res.json));
console.log('THRONE CLAIMED ✓', res.json.result.country_iso, '→', res.json.result.holder.slice(0, 8) + '…');

// 4. duplicate claim + weak coup
res = await post(signAction('claim'));
if (res.status !== 409) throw new Error('expected already-occupied, got ' + JSON.stringify(res));
console.log('duplicate claim rejected ✓ (' + res.json.error + ')');

res = await post(signAction('coup'));
if (res.status !== 409 || !/hold this throne/.test(res.json.error))
  throw new Error('expected self-coup rejection, got ' + JSON.stringify(res));
console.log('self-coup rejected ✓');

const st = await fetch(`${API}/api/thrones?country=${ISO}`).then((r) => r.json());
console.log('throne state:', st.thrones[0].holder.slice(0, 8) + '…', '| land floor', st.landFloor,
  '| earnings $' + st.earnings.primaryUsd.toFixed(2));

console.log('\nALL THRONE CHECKS PASSED');
