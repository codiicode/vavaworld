/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/tiles.json`.
 */
export type Tiles = {
  "address": "GNfEEPYES1k2sZnoBfWbA51zYZVSyeB46te6EyL8CzBt",
  "metadata": {
    "name": "tiles",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Tomorrowland tiles program."
  },
  "instructions": [
    {
      "name": "claim",
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "claimer",
          "writable": true,
          "signer": true
        },
        {
          "name": "treasury",
          "writable": true,
          "address": "74fWA4NXGtv7RJEd9oTJk9vjqZCTMz2W1s5soCvC6b4X"
        },
        {
          "name": "t1Counter",
          "writable": true
        },
        {
          "name": "t2Counter",
          "writable": true
        },
        {
          "name": "t3Counter",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "h3Ids",
          "type": {
            "vec": "u64"
          }
        },
        {
          "name": "expectedMaxTotal",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initCounter",
      "discriminator": [
        247,
        168,
        146,
        45,
        125,
        26,
        142,
        80
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "address": "74fWA4NXGtv7RJEd9oTJk9vjqZCTMz2W1s5soCvC6b4X"
        },
        {
          "name": "counter",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "tier",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "tierCounter",
      "discriminator": [
        233,
        165,
        123,
        122,
        110,
        54,
        55,
        207
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "batchSizeInvalid",
      "msg": "h3_ids length out of range [1,20]"
    },
    {
      "code": 6001,
      "name": "alreadyClaimed",
      "msg": "Tile already claimed"
    },
    {
      "code": 6002,
      "name": "pdaInvalid",
      "msg": "Tile PDA does not match the expected h3_id"
    },
    {
      "code": 6003,
      "name": "treasuryMismatch",
      "msg": "Treasury account mismatch"
    },
    {
      "code": 6004,
      "name": "slippageExceeded",
      "msg": "Total cost exceeds expected_max_total (slippage)"
    },
    {
      "code": 6005,
      "name": "counterMismatch",
      "msg": "Counter PDA mismatch for tier"
    },
    {
      "code": 6006,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6007,
      "name": "invalidH3",
      "msg": "Invalid h3 cell — could not derive coordinates"
    },
    {
      "code": 6008,
      "name": "tierInvalid",
      "msg": "Tier value out of range"
    }
  ],
  "types": [
    {
      "name": "tierCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tier",
            "type": "u8"
          },
          {
            "name": "sold",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
