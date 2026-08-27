/**
 * One-time v2 config init on devnet: points the program at the stand-in
 * $VAVA mint (pump.fun-identical: 6 decimals, 1B supply, mint authority
 * revoked) and creates the buyback escrow + token vault PDAs.
 *
 * Usage: node scripts/init-config.mjs <mint-address> [keeper-address]
 * Keeper defaults to the local wallet (it runs the devnet buyback bot).
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';

const mintArg = process.argv[2];
if (!mintArg) {
  console.error('Usage: node scripts/init-config.mjs <mint-address> [keeper-address]');
  process.exit(1);
}

const idl = JSON.parse(readFileSync(new URL('../../lib/anchor-idl.json', import.meta.url), 'utf-8'));
const programId = new PublicKey(idl.address);

const keypairBytes = JSON.parse(readFileSync(join(homedir(), '.config', 'solana', 'id.json'), 'utf-8'));
const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairBytes));

const connection = new Connection('https://api.devnet.solana.com', { commitment: 'confirmed' });
const wallet = new Wallet(keypair);
const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
const program = new Program(idl, provider);

const vavaMint = new PublicKey(mintArg);
const keeper = process.argv[3] ? new PublicKey(process.argv[3]) : wallet.publicKey;

const [config] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
const [buybackVault] = PublicKey.findProgramAddressSync([Buffer.from('buyback')], programId);
const [vavaVault] = PublicKey.findProgramAddressSync(
  [Buffer.from('vault'), vavaMint.toBuffer()],
  programId,
);

console.log('config       ', config.toBase58());
console.log('buyback_vault', buybackVault.toBase58());
console.log('vava_vault   ', vavaVault.toBase58());

const sig = await program.methods
  .initConfig(keeper)
  .accounts({
    admin: wallet.publicKey,
    config,
    buybackVault,
    vavaMint,
    vavaVault,
  })
  .rpc();
console.log('init_config sig:', sig);

const cfg = await program.account.config.fetch(config);
console.log('mint  :', cfg.vavaMint.toBase58());
console.log('keeper:', cfg.keeper.toBase58());
console.log('locked:', cfg.mintLocked);
