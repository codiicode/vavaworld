/**
 * Buyback keeper service: converts every tile's escrowed pending_sol into
 * embedded $VAVA via the program's `embed` instruction.
 *
 * The keeper buys $VAVA with its own funds and `embed` reimburses it the
 * escrowed lamports. On devnet there is no market, so the "buy" uses a fixed
 * reference price (VAVA_USD); on mainnet set KEEPER_SWAP=jupiter once the
 * swap leg is wired - the on-chain mechanics are identical either way.
 *
 * Runs two ways:
 *   one-shot      node anchor/scripts/keeper-embed.mjs
 *   as a service  KEEPER_INTERVAL_SECS=60 npm run keeper
 *
 * Keys come from env (Railway) with local files as a dev fallback:
 *   KEEPER_SECRET_KEY   base58 secret key - REQUIRED, signs embed()
 *   FUNDER_SECRET_KEY   base58 - OPTIONAL, devnet only: tops the keeper up
 *                       with SOL + test-VAVA. Omit in production.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  Connection, Keypair, PublicKey, SystemProgram, Transaction,
} from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN, BorshAccountsCoder } from '@coral-xyz/anchor';
import bs58 from 'bs58';

const RPC_URL =
  process.env.RPC_URL ?? process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com';
const INTERVAL_SECS = Number(process.env.KEEPER_INTERVAL_SECS ?? 0);
const VAVA_USD = Number(process.env.VAVA_REFERENCE_USD ?? 0.0001);
const SOL_PRICE_URL = process.env.SOL_PRICE_URL ?? 'https://vavaworld.vercel.app/api/sol-price';

const TOKEN = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA_PROG = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

const idl = JSON.parse(readFileSync(new URL('../../lib/anchor-idl.json', import.meta.url), 'utf-8'));
const programId = new PublicKey(idl.address);
const coder = new BorshAccountsCoder(idl);

/** Env base58 key first (Railway); local keypair file only as a dev fallback. */
function loadKeypair(envName, fallbackPath, { required = false } = {}) {
  const raw = process.env[envName];
  if (raw && raw.trim()) {
    try {
      return Keypair.fromSecretKey(bs58.decode(raw.trim()));
    } catch (e) {
      throw new Error(`${envName} is not a valid base58 secret key: ${e.message}`);
    }
  }
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(fallbackPath, 'utf-8'))));
  } catch {
    if (required) throw new Error(`${envName} not set and no keypair file at ${fallbackPath}`);
    return null;
  }
}

const conn = new Connection(RPC_URL, 'confirmed');
const keeper = loadKeypair(
  'KEEPER_SECRET_KEY',
  new URL('../keeper-keypair.json', import.meta.url).pathname.replace(/^\//, ''),
  { required: true },
);
const funder = loadKeypair('FUNDER_SECRET_KEY', join(homedir(), '.config', 'solana', 'id.json'));

const ata = (owner, mint) =>
  PublicKey.findProgramAddressSync([owner.toBuffer(), TOKEN.toBuffer(), mint.toBuffer()], ATA_PROG)[0];
const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
const [buybackVault] = PublicKey.findProgramAddressSync([Buffer.from('buyback')], programId);

const provider = new AnchorProvider(conn, new Wallet(keeper), { commitment: 'confirmed' });
const program = new Program(idl, provider);

async function solUsd() {
  try {
    const r = await fetch(SOL_PRICE_URL);
    const j = await r.json();
    if (Number.isFinite(j.solUsd) && j.solUsd > 0) return j.solUsd;
  } catch { /* fall through */ }
  return 105;
}

/** Devnet convenience: keep the keeper funded. No-op without FUNDER_SECRET_KEY. */
async function topUpKeeper(mint) {
  if (!funder) return;
  const keeperAta = ata(keeper.publicKey, mint);
  const setup = new Transaction();

  if ((await conn.getBalance(keeper.publicKey)) < 10_000_000) {
    setup.add(SystemProgram.transfer({
      fromPubkey: funder.publicKey, toPubkey: keeper.publicKey, lamports: 30_000_000,
    }));
  }
  if (!(await conn.getAccountInfo(keeperAta))) {
    setup.add({
      programId: ATA_PROG,
      keys: [
        { pubkey: funder.publicKey, isSigner: true, isWritable: true },
        { pubkey: keeperAta, isSigner: false, isWritable: true },
        { pubkey: keeper.publicKey, isSigner: false, isWritable: false },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([]),
    });
  }
  if (setup.instructions.length > 0) {
    setup.feePayer = funder.publicKey;
    setup.recentBlockhash = (await conn.getLatestBlockhash('confirmed')).blockhash;
    setup.sign(funder);
    await conn.confirmTransaction(await conn.sendRawTransaction(setup.serialize()), 'confirmed');
    console.log('[keeper] funded / ATA created');
  }

  const bal = await conn.getTokenAccountBalance(keeperAta)
    .then((b) => Number(b.value.amount)).catch(() => 0);
  if (bal < 1_000_000_000) {
    const amount = Buffer.alloc(8);
    amount.writeBigUInt64LE(10_000_000_000n);
    const tx = new Transaction().add({
      programId: TOKEN,
      keys: [
        { pubkey: ata(funder.publicKey, mint), isSigner: false, isWritable: true },
        { pubkey: keeperAta, isSigner: false, isWritable: true },
        { pubkey: funder.publicKey, isSigner: true, isWritable: false },
      ],
      data: Buffer.concat([Buffer.from([3]), amount]),
    });
    tx.feePayer = funder.publicKey;
    tx.recentBlockhash = (await conn.getLatestBlockhash('confirmed')).blockhash;
    tx.sign(funder);
    await conn.confirmTransaction(await conn.sendRawTransaction(tx.serialize()), 'confirmed');
    console.log('[keeper] topped up test-VAVA');
  }
}

async function runOnce() {
  // The mint is read from on-chain config every pass, so launch day's
  // update_mint flows through without redeploying this service.
  const cfg = await program.account.config.fetch(configPda);
  const mint = cfg.vavaMint ?? cfg.vava_mint;
  const [vavaVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), mint.toBuffer()], programId);
  const keeperAta = ata(keeper.publicKey, mint);

  await topUpKeeper(mint);

  const accounts = await conn.getProgramAccounts(programId, { filters: [{ dataSize: 82 }] });
  const pending = [];
  for (const a of accounts) {
    try {
      const t = coder.decode('Tile', a.account.data);
      const p = BigInt((t.pending_sol ?? t.pendingSol).toString());
      if (p > 0n) pending.push({ pda: a.pubkey, pending: p });
    } catch { /* not a v2 tile */ }
  }
  if (pending.length === 0) {
    console.log('[keeper] nothing pending');
    return;
  }

  const rate = await solUsd();
  console.log(`[keeper] settling ${pending.length} tiles @ SOL $${rate.toFixed(2)}`);

  let settled = 0;
  for (const { pda, pending: lamports } of pending) {
    // Escrowed SOL -> USD -> $VAVA base units (6 decimals).
    const usd = (Number(lamports) / 1e9) * rate;
    const amount = new BN(Math.max(1, Math.round((usd / VAVA_USD) * 1e6)));
    try {
      const sig = await program.methods.embed(amount).accounts({
        keeper: keeper.publicKey,
        config: configPda,
        tile: pda,
        buybackVault,
        keeperToken: keeperAta,
        vavaVault,
      }).rpc();
      settled += 1;
      console.log(`[keeper] embedded ${(amount.toNumber() / 1e6).toFixed(2)} VAVA -> ${pda.toBase58().slice(0, 8)}… ${sig.slice(0, 16)}…`);
    } catch (e) {
      // One failing tile must never take the service down.
      console.error(`[keeper] embed failed for ${pda.toBase58().slice(0, 8)}…:`, String(e).slice(0, 160));
    }
  }
  console.log(`[keeper] pass complete: ${settled}/${pending.length} settled`);
}

console.log(`[keeper] rpc=${RPC_URL} program=${programId.toBase58()} keeper=${keeper.publicKey.toBase58()}`);
if (INTERVAL_SECS > 0) {
  console.log(`[keeper] service mode, every ${INTERVAL_SECS}s`);
  for (;;) {
    try {
      await runOnce();
    } catch (e) {
      console.error('[keeper] pass failed:', String(e).slice(0, 200));
    }
    await new Promise((r) => setTimeout(r, INTERVAL_SECS * 1000));
  }
} else {
  await runOnce();
  process.exit(0);
}
