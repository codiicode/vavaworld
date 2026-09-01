/**
 * Launch-minute: point the program at the REAL $VAVA mint.
 *
 * Usage: RPC_URL=<mainnet rpc> node anchor/scripts/update-mint.mjs <new-mint>
 *
 * Guards enforced on-chain: admin-only, refuses if the mint is locked,
 * and refuses while the OLD vault still holds tokens - raze every
 * rehearsal hex first so the stand-in vault is empty.
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';

const mintArg = process.argv[2];
if (!mintArg) {
  console.error('Usage: RPC_URL=... node anchor/scripts/update-mint.mjs <new-mint>');
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

const newMint = new PublicKey(mintArg);
const [config] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
const cfg = await program.account.config.fetch(config);
const oldMint = new PublicKey((cfg.vavaMint ?? cfg.vava_mint).toString());
const [oldVault] = PublicKey.findProgramAddressSync([Buffer.from('vault'), oldMint.toBuffer()], programId);
const [newVault] = PublicKey.findProgramAddressSync([Buffer.from('vault'), newMint.toBuffer()], programId);

console.log('program:', programId.toBase58());
console.log('old mint:', oldMint.toBase58());
console.log('new mint:', newMint.toBase58());

const sig = await program.methods.updateMint().accounts({
  admin: keypair.publicKey,
  config,
  oldVault,
  newMint,
  newVault,
}).rpc();
console.log('update_mint sig:', sig);

const after = await program.account.config.fetch(config);
console.log('config.vava_mint now:', new PublicKey((after.vavaMint ?? after.vava_mint).toString()).toBase58());
