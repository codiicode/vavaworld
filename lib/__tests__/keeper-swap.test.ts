import { describe, expect, it } from 'vitest';
import { WSOL_MINT, buildOrderUrl, jupiterSwap, proRata } from '../../anchor/scripts/keeper-swap.mjs';

const t = (pending: bigint) => ({ pending });

describe('proRata', () => {
  it('splits proportionally and sums to exactly totalOut', () => {
    const shares = proRata(1_000_000n, [t(100n), t(200n), t(700n)]);
    expect(shares).toEqual([100_000n, 200_000n, 700_000n]);
  });

  it('largest-remainder rounding still sums exactly', () => {
    const tiles = [t(1n), t(1n), t(1n)];
    const shares = proRata(100n, tiles);
    expect(shares.reduce((s: bigint, x: bigint) => s + x, 0n)).toBe(100n);
    // 100/3 -> 34/33/33 in some order
    expect([...shares].sort().map(String)).toEqual(['33', '33', '34']);
  });

  it('handles zero pending and zero output', () => {
    expect(proRata(0n, [t(5n)])).toEqual([0n]);
    expect(proRata(10n, [t(0n), t(0n)])).toEqual([0n, 0n]);
  });

  it('never loses units on adversarial ratios', () => {
    const tiles = [t(3n), t(7n), t(11n), t(13n), t(1n)];
    const total = 999_999_999_999n;
    const shares = proRata(total, tiles);
    expect(shares.reduce((s: bigint, x: bigint) => s + x, 0n)).toBe(total);
  });
});

describe('buildOrderUrl', () => {
  it('builds the v2 order URL with all params', () => {
    const url = buildOrderUrl('https://api.jup.ag/swap/v2', {
      inputMint: WSOL_MINT,
      outputMint: 'MintXYZ',
      amount: 123n,
      taker: 'TakerABC',
    });
    expect(url).toBe(
      `https://api.jup.ag/swap/v2/order?inputMint=${WSOL_MINT}&outputMint=MintXYZ&amount=123&taker=TakerABC`,
    );
  });

  it('tolerates a trailing slash on the base URL', () => {
    const url = buildOrderUrl('https://example.com/', {
      inputMint: 'a', outputMint: 'b', amount: 1n, taker: 'c',
    });
    expect(url.startsWith('https://example.com/order?')).toBe(true);
  });
});

describe('jupiterSwap error paths', () => {
  const signer = { publicKey: { toBase58: () => 'Keeper11111111111111111111111111111111111111' } };
  const base = { baseUrl: 'https://api.test', apiKey: '', signer, outputMint: 'Mint', amountLamports: 10n };

  it('throws on non-executable order (no transaction)', async () => {
    const fakeFetch = async () => ({
      ok: true,
      json: async () => ({ transaction: '', errorCode: 7, errorMessage: 'no route' }),
    });
    await expect(jupiterSwap(base, fakeFetch as never)).rejects.toThrow(/no route/);
  });

  it('throws on order HTTP error', async () => {
    const fakeFetch = async () => ({ ok: false, status: 429, text: async () => 'rate limited' });
    await expect(jupiterSwap(base, fakeFetch as never)).rejects.toThrow(/429/);
  });
});

describe('encodePath', () => {
  const A = '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168'; // USDG
  const B = '0x0bd7d308f8e1639FAb988df18A8011f41eACAd73'; // WETH
  const C = '0x1111111111111111111111111111111111111111';

  it('packs token(20B)+fee(3B)+token per Uniswap v3 spec', async () => {
    const { encodePath } = await import('../../scripts/keeper-math.mjs');
    const path = encodePath([A, B], [100]);
    expect(path).toBe('0x' + A.slice(2).toLowerCase() + '000064' + B.slice(2).toLowerCase());
    expect(path.length).toBe(2 + 40 + 6 + 40);
  });

  it('two-hop path carries both fees in order', async () => {
    const { encodePath } = await import('../../scripts/keeper-math.mjs');
    const path = encodePath([A, B, C], [100, 3000]);
    expect(path).toBe(
      '0x' + A.slice(2).toLowerCase() + '000064' + B.slice(2).toLowerCase() + '000bb8' + C.slice(2).toLowerCase(),
    );
  });

  it('rejects mismatched token/fee counts', async () => {
    const { encodePath } = await import('../../scripts/keeper-math.mjs');
    expect(() => encodePath([A, B], [100, 3000])).toThrow();
  });
});
