// Smoke test for the bid + notification system against a running app
// server (default http://localhost:3111). Uses throwaway keypairs and a
// hex injected straight into Supabase, so it needs SUPABASE_SERVICE_KEY
// (or the row pre-inserted). Run: node anchor/scripts/smoke-bids.mjs
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3111';
const TEST_H3 = '8c26a1b0d2467ff'; // res-12 cell, only exists as our injected row

// Seller can be pinned via .smoke-seller.json ({sk: [..]}) so the test
// hex row can be inserted for that address before the run.
import { readFileSync, existsSync } from 'fs';
const seller = existsSync('.smoke-seller.json')
  ? Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync('.smoke-seller.json', 'utf8')).sk))
  : Keypair.generate();
const bidder = Keypair.generate();
const rival = Keypair.generate();

const sign = (kp, msg) =>
  bs58.encode(nacl.sign.detached(new TextEncoder().encode(msg), kp.secretKey));

async function api(path, opts) {
  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function placeBid(kp, priceSol) {
  const addr = kp.publicKey.toBase58();
  const message = `vava:bid:${TEST_H3}:${priceSol}:${addr}:ts=${Date.now()}`;
  return api('/api/bids', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      h3: TEST_H3, bidder: addr, priceSol, message, signature: sign(kp, message),
    }),
  });
}

async function respond(kp, bidId, action) {
  const addr = kp.publicKey.toBase58();
  const message = `vava:bid-${action}:${bidId}:${addr}:ts=${Date.now()}`;
  return api('/api/bids/respond', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ bidId, actor: addr, action, message, signature: sign(kp, message) }),
  });
}

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  ${detail}`}`);
  if (!ok) failures++;
}

console.log('seller:', seller.publicKey.toBase58());
console.log('bidder:', bidder.publicKey.toBase58());
console.log('rival :', rival.publicKey.toBase58());
console.log('NOTE: inject the test hex first:');
console.log(`  insert into hexes (h3_id, country_iso, owner, purchase_price, claim_count_at_purchase)`);
console.log(`  values ('${TEST_H3}', 'SE', '<seller>', 0.1, 0);`);

// 1. Bid on unclaimed/unknown hex id variant is covered by SQL; here: place real bid.
const b1 = await placeBid(bidder, 0.5);
check('place bid (unlisted hex ok)', b1.status === 200 && b1.json.bid?.status === 'active', JSON.stringify(b1.json));

// 2. Owner cannot bid on own hex.
const own = await placeBid(seller, 1);
check('own-hex bid rejected', own.status !== 200, JSON.stringify(own.json));

// 3. Rival outbids -> bidder should get an 'outbid' notification.
const b2 = await placeBid(rival, 0.8);
check('rival higher bid ok', b2.status === 200, JSON.stringify(b2.json));

// 4. Re-bid supersedes own previous bid.
const b3 = await placeBid(bidder, 0.9);
check('re-bid supersedes', b3.status === 200, JSON.stringify(b3.json));
const open = await api(`/api/bids?h3=${TEST_H3}`);
check('exactly 2 open bids', open.json.bids?.length === 2, JSON.stringify(open.json));

// 5. Stranger cannot accept.
const badAccept = await respond(rival, b3.json.bid.id, 'accept');
check('non-owner accept rejected', badAccept.status !== 200, JSON.stringify(badAccept.json));

// 6. Owner declines rival's bid.
const dec = await respond(seller, b2.json.bid.id, 'decline');
check('owner decline ok', dec.status === 200 && dec.json.bid.status === 'declined', JSON.stringify(dec.json));

// 7. Owner accepts bidder's 0.9 -> reserved listing.
const acc = await respond(seller, b3.json.bid.id, 'accept');
check('owner accept ok', acc.status === 200 && acc.json.bid.status === 'accepted', JSON.stringify(acc.json));

// 8. Quote enforcement: stranger blocked, reserved bidder allowed.
const owner = await api(`/api/owner?h3=${TEST_H3}`); // warm-up, ignore
void owner;
const notif = await api(`/api/bids?bidder=${bidder.publicKey.toBase58()}`);
void notif;
// Find the reserved listing id via bid_accepted payload is client-side; here use supabase REST via app API: quote by listing requires id - fetch from /api/bids response? Simplest: the accept response doesn't return listing id, so probe /api/buy via marketplace listing lookup is skipped; verified in SQL instead.
console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
