import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { tilePda, counterPda } from '../tile-pda';

const PROGRAM_ID = new PublicKey('GNfEEPYES1k2sZnoBfWbA51zYZVSyeB46te6EyL8CzBt');

describe('tilePda', () => {
  it('derives a PDA from h3 hex string', () => {
    const [pda, bump] = tilePda('892a100c8a3ffff', PROGRAM_ID);
    expect(pda).toBeInstanceOf(PublicKey);
    expect(typeof bump).toBe('number');
  });

  it('is deterministic for same h3 + program', () => {
    const [a] = tilePda('892a100c8a3ffff', PROGRAM_ID);
    const [b] = tilePda('892a100c8a3ffff', PROGRAM_ID);
    expect(a.toBase58()).toBe(b.toBase58());
  });

  it('differs for different h3', () => {
    const [a] = tilePda('892a100c8a3ffff', PROGRAM_ID);
    const [b] = tilePda('892a100c8a47fff', PROGRAM_ID);
    expect(a.toBase58()).not.toBe(b.toBase58());
  });
});

describe('counterPda', () => {
  it('three different PDAs for tiers 1/2/3', () => {
    const [t1] = counterPda(1, PROGRAM_ID);
    const [t2] = counterPda(2, PROGRAM_ID);
    const [t3] = counterPda(3, PROGRAM_ID);
    const set = new Set([t1.toBase58(), t2.toBase58(), t3.toBase58()]);
    expect(set.size).toBe(3);
  });
});
