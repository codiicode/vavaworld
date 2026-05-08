import { PublicKey } from '@solana/web3.js';

export function tilePda(h3Hex: string, programId: PublicKey): [PublicKey, number] {
  const h3BigInt = BigInt('0x' + h3Hex);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(h3BigInt, 0);
  return PublicKey.findProgramAddressSync([Buffer.from('tile'), buf], programId);
}

export function counterPda(tier: 1 | 2 | 3, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('counter'), Buffer.from([tier])],
    programId,
  );
}
