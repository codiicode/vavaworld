import { describe, expect, it } from 'vitest';
import {
  encodeAbiParameters,
  encodePacked,
  hashTypedData,
  keccak256,
  recoverTypedDataAddress,
  toBytes,
} from 'viem';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { CLAIM_DOMAIN, CLAIM_TYPES, h3ToUint64, uint64ToH3 } from '../evm';

const CONTRACT = '0x1111111111111111111111111111111111111111' as const;
const CHAIN_ID = 46630; // placeholder - the lock is structural, not chain-bound

const message = {
  payToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
      claimer: '0x48097570cAe9857034536CE7226D34AF4E5587B9' as `0x${string}`,
  h3s: [h3ToUint64('8c1fb46741ae9ff'), h3ToUint64('8c1fb46741a17ff')],
  prices: [123456789000000n, 987654321000000n],
  tiers: [1, 3],
  countries: [0x5345, 0],
  expiry: 1790000000n,
};

describe('h3 <-> uint64', () => {
  it('roundtrips real res-12 cells', () => {
    for (const h3 of ['8c1fb46741ae9ff', '8c2ab30c10001ff', '8c0000000000001']) {
      expect(uint64ToH3(h3ToUint64(h3))).toBe(h3);
    }
  });
  it('rejects out-of-range values', () => {
    expect(() => h3ToUint64('ffffffffffffffff1')).toThrow();
  });
});

describe('EIP-712 quote matches VavaTiles.sol byte-for-byte', () => {
  it('viem hashTypedData equals a manual replay of the contract hashing', () => {
    // --- replicate _verifyQuote from VavaTiles.sol exactly ---
    const TYPEHASH = keccak256(
      toBytes('VavaClaim(address claimer,address payToken,uint64[] h3s,uint256[] prices,uint8[] tiers,uint16[] countries,uint256 expiry)'),
    );
    const DOMAIN_SEPARATOR = keccak256(
      encodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }, { type: 'uint256' }, { type: 'address' }],
        [
          keccak256(toBytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
          keccak256(toBytes('VAVAWORLD')),
          keccak256(toBytes('1')),
          BigInt(CHAIN_ID),
          CONTRACT,
        ],
      ),
    );
    const structHash = keccak256(
      encodeAbiParameters(
        [{ type: 'bytes32' }, { type: 'address' }, { type: 'address' }, { type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }, { type: 'uint256' }],
        [
          TYPEHASH,
          message.claimer,
          message.payToken,
          keccak256(encodePacked(['uint64[]'], [message.h3s])),
          keccak256(encodePacked(['uint256[]'], [message.prices])),
          keccak256(encodePacked(['uint8[]'], [message.tiers])),
          keccak256(encodePacked(['uint16[]'], [message.countries])),
          message.expiry,
        ],
      ),
    );
    const contractDigest = keccak256(
      encodePacked(['bytes2', 'bytes32', 'bytes32'], ['0x1901', DOMAIN_SEPARATOR, structHash]),
    );

    const viemDigest = hashTypedData({
      domain: CLAIM_DOMAIN(CHAIN_ID, CONTRACT),
      types: CLAIM_TYPES,
      primaryType: 'VavaClaim',
      message,
    });

    expect(viemDigest).toBe(contractDigest);
  });

  it('sign -> recover roundtrip lands on the keeper address', async () => {
    const keeper = privateKeyToAccount(generatePrivateKey());
    const signature = await keeper.signTypedData({
      domain: CLAIM_DOMAIN(CHAIN_ID, CONTRACT),
      types: CLAIM_TYPES,
      primaryType: 'VavaClaim',
      message,
    });
    const recovered = await recoverTypedDataAddress({
      domain: CLAIM_DOMAIN(CHAIN_ID, CONTRACT),
      types: CLAIM_TYPES,
      primaryType: 'VavaClaim',
      message,
      signature,
    });
    expect(recovered).toBe(keeper.address);
  });
});
