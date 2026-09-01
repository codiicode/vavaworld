// E2E: property-image upload/remove with signed-message auth.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import sharp from 'sharp';

const API = 'http://localhost:3111';
const H3S = ['8c2ab30c10001ff', '8c2ab30c10003ff'];
const kp = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(join(homedir(), '.config', 'solana', 'id.json'), 'utf-8'))),
);
const sign = (msg) => bs58.encode(nacl.sign.detached(new TextEncoder().encode(msg), kp.secretKey));

// 512x512 test png
const png = await sharp({ create: { width: 512, height: 512, channels: 3, background: { r: 20, g: 184, b: 166 } } }).png().toBuffer();

// 1. Happy path
let message = `vava:property-image:${H3S.length}:ts=${Date.now()}`;
let form = new FormData();
form.set('image', new File([png], 'test.png', { type: 'image/png' }));
form.set('h3s', JSON.stringify(H3S));
form.set('address', kp.publicKey.toBase58());
form.set('message', message);
form.set('signature', sign(message));
let r = await fetch(`${API}/api/property-image`, { method: 'POST', body: form });
let j = await r.json();
if (!r.ok) throw new Error('upload failed: ' + JSON.stringify(j));
console.log('UPLOAD OK:', j.count, 'hexes ->', j.url);

// 2. Image publicly fetchable + is webp
const imgRes = await fetch(j.url.startsWith('http') ? j.url : API + j.url);
const ct = imgRes.headers.get('content-type');
if (!imgRes.ok || !String(ct).includes('webp')) throw new Error(`public fetch bad: ${imgRes.status} ${ct}`);
console.log('PUBLIC FETCH OK:', ct, imgRes.headers.get('content-length'), 'bytes');

// 3. /api/claimed carries it
const claimed = await (await fetch(`${API}/api/claimed`)).json();
const rows = claimed.hexes.filter((h) => H3S.includes(h.h3));
if (rows.length !== 2 || !rows.every((h) => h.imageUrl)) throw new Error('claimed registry missing imageUrl');
console.log('REGISTRY OK: imageUrl on both hexes');

// 4. Attack: wrong signer
const evil = Keypair.generate();
message = `vava:property-image:${H3S.length}:ts=${Date.now()}`;
form = new FormData();
form.set('image', new File([png], 'x.png', { type: 'image/png' }));
form.set('h3s', JSON.stringify(H3S));
form.set('address', evil.publicKey.toBase58());
form.set('message', message);
form.set('signature', bs58.encode(nacl.sign.detached(new TextEncoder().encode(message), evil.secretKey)));
r = await fetch(`${API}/api/property-image`, { method: 'POST', body: form });
if (r.status !== 403) throw new Error('non-owner upload was not rejected: ' + r.status);
console.log('NON-OWNER REJECTED (403) OK');

// 5. Attack: not an image
message = `vava:property-image:${H3S.length}:ts=${Date.now()}`;
form = new FormData();
form.set('image', new File([Buffer.from('<script>alert(1)</script>')], 'x.png', { type: 'image/png' }));
form.set('h3s', JSON.stringify(H3S));
form.set('address', kp.publicKey.toBase58());
form.set('message', message);
form.set('signature', sign(message));
r = await fetch(`${API}/api/property-image`, { method: 'POST', body: form });
if (r.status !== 400) throw new Error('non-image upload was not rejected: ' + r.status);
console.log('NON-IMAGE REJECTED (400) OK');

// 6. Remove
message = `vava:property-image:${H3S.length}:ts=${Date.now()}`;
r = await fetch(`${API}/api/property-image`, {
  method: 'DELETE',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ h3s: H3S, address: kp.publicKey.toBase58(), message, signature: sign(message) }),
});
if (!r.ok) throw new Error('remove failed');
console.log('REMOVE OK');
console.log('ALL PROPERTY-IMAGE E2E PASSED');
