import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';

const idl = JSON.parse(readFileSync(new URL('../../lib/anchor-idl.json', import.meta.url), 'utf-8'));
const programId = new PublicKey(idl.address);

const keypairBytes = JSON.parse(readFileSync(join(homedir(), '.config', 'solana', 'id.json'), 'utf-8'));
const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairBytes));

const connection = new Connection('https://api.devnet.solana.com', { commitment: 'confirmed' });
const wallet = new Wallet(keypair);
const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
const program = new Program(idl, provider);

for (const tier of [1, 2, 3]) {
  const [counter] = PublicKey.findProgramAddressSync(
    [Buffer.from('counter'), Buffer.from([tier])],
    programId,
  );
  try {
    const sig = await program.methods
      .initCounter(tier)
      .accounts({
        admin: wallet.publicKey,
        counter,
      })
      .rpc();
    console.log(`Initialized tier ${tier} counter (sig: ${sig})`);
  } catch (e) {
    if (String(e).includes('already in use') || String(e).includes('AccountAlreadyInUse')) {
      console.log(`Tier ${tier} counter already exists, skipping`);
    } else {
      console.error(`Tier ${tier} failed:`, e);
      process.exit(1);
    }
  }
}

console.log('Done.');
