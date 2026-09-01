/**
 * PERMANENTLY seal the program's mint choice. There is no unlock - run
 * this only after update-mint.mjs points at the real $VAVA mint and a
 * claim + keeper pass have been verified against it.
 *
 * Usage: RPC_URL=<mainnet rpc> node anchor/scripts/lock-mint.mjs --yes
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';

if (process.argv[2] !== '--yes') {
  console.error('This is IRREVERSIBLE. Re-run with --yes to confirm.');
  process.exit(1);
}

const idl = JSON.parse(readFileSync(new URL('../../lib/anchor-idl.json', import.meta.url), 'utf-8'));
const programId = new PublicKey(idl.address);
const keypair = Keypair.fromSecretKey(Uint8Array.from(
  JSON.parse(readFileSync(join(homedir(), '.config', 'solana', 'id.json'), 'utf-8')),
));
const connection = new Connection(process.env.RPC_URL ?? 'https://api.devnet.solana.com', { commitment: 'confirmed' });
const provider = new AnchorProvider(connection, new Wallet(keypair), { commitment: 'confirmed' });
const program = new Program(idl, provider);

const [config] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
const before = await program.account.config.fetch(config);
console.log('locking mint:', new PublicKey((before.vavaMint ?? before.vava_mint).toString()).toBase58());

const sig = await program.methods.lockMint().accounts({
  admin: keypair.publicKey,
  config,
}).rpc();
console.log('lock_mint sig:', sig);

const after = await program.account.config.fetch(config);
console.log('mint_locked:', after.mintLocked ?? after.mint_locked);
