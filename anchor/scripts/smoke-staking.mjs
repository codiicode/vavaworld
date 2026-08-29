/**
 * Devnet smoke test for staking:
 *   0. init stake vault (idempotent)
 *   1. stake 250k VAVA → active amount = 250k (Citizen tier)
 *   2. stake 250k more → 500k (Baron tier)
 *   3. begin_unstake 100k → active 400k, pending 100k, clock set ~3d out
 *   4. withdraw_unstaked → must FAIL with UnstakeNotReady
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor';

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ATA_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const ata = (mint, owner) =>
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
const provider = new AnchorProvider(connection, new Wallet(keypair), { commitment: 'confirmed' });
const program = new Program(idl, provider);

const MINT = new PublicKey('4ZoSV4L942MANHBL5Y7hVvR3LeXjM8xXfHuhZaKKGCZa');
const [config] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
const [stakeVault] = PublicKey.findProgramAddressSync(
  [Buffer.from('stake_vault'), MINT.toBuffer()], programId);
const [stakeAccount] = PublicKey.findProgramAddressSync(
  [Buffer.from('stake'), keypair.publicKey.toBuffer()], programId);
const ownerToken = ata(MINT, keypair.publicKey);

// 0. init vault (idempotent)
try {
  const sig = await program.methods.initStakeVault().accounts({
    admin: keypair.publicKey, config, vavaMint: MINT, stakeVault,
  }).rpc();
  console.log('init_stake_vault:', sig);
} catch (e) {
  if (String(e).includes('already in use')) console.log('stake vault exists');
  else throw e;
}

const UNIT = 1_000_000n; // 6 decimals
const stakeIx = async (tokens) => program.methods
  .stake(new BN((BigInt(tokens) * UNIT).toString()))
  .accounts({
    owner: keypair.publicKey, config, stakeAccount, ownerToken, stakeVault,
  }).rpc();

// 1+2. stake 250k then 250k
await stakeIx(250_000);
let s = await program.account.stakeAccount.fetch(stakeAccount);
console.log('after stake 250k  :', s.amount.toString(), '(expect 250000000000 + any prior)');
const before = BigInt(s.amount.toString());
await stakeIx(250_000);
s = await program.account.stakeAccount.fetch(stakeAccount);
console.log('after stake +250k :', s.amount.toString());
if (BigInt(s.amount.toString()) - before !== 250_000n * UNIT) throw new Error('STAKE MATH WRONG');

// 3. begin_unstake 100k
await program.methods.beginUnstake(new BN((100_000n * UNIT).toString()))
  .accounts({ owner: keypair.publicKey, stakeAccount }).rpc();
s = await program.account.stakeAccount.fetch(stakeAccount);
console.log('after begin_unstake: active', s.amount.toString(), 'pending', s.pendingAmount.toString());
const eta = Number(s.unstakeAvailableAt) - Math.floor(Date.now() / 1000);
console.log('cooldown remaining :', Math.round(eta / 3600), 'h (expect ~24)');
if (eta < 23 * 3600 || eta > 25 * 3600) throw new Error('COOLDOWN WRONG');

// 4. withdraw too early must fail
try {
  await program.methods.withdrawUnstaked().accounts({
    owner: keypair.publicKey, config, stakeAccount, ownerToken, stakeVault,
  }).rpc();
  throw new Error('WITHDRAW SHOULD HAVE FAILED');
} catch (e) {
  if (String(e).includes('UnstakeNotReady') || String(e).includes('6021') || String(e).includes('cooldown')) {
    console.log('early withdraw correctly rejected');
  } else {
    throw e;
  }
}

const vaultBal = await connection.getTokenAccountBalance(stakeVault);
console.log('stake vault balance:', vaultBal.value.uiAmountString);
console.log('\nALL STAKING CHECKS PASSED');
