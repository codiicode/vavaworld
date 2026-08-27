use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Tile {
    pub owner: Pubkey,       // 32
    pub h3_id: u64,          // 8
    pub claimed_at: i64,     // 8
    pub tier: u8,            // 1
    pub price_paid: u64,     // 8
    pub bump: u8,            // 1
    // v2: the 15% buyback share of this tile's price, escrowed in the
    // buyback vault until the keeper converts it to $VAVA (lamports).
    pub pending_sol: u64,    // 8
    // v2: $VAVA locked inside this hex (base units of the config mint).
    // Only raze releases it.
    pub embedded_vava: u64,  // 8
}
// Anchor disc 8 + fields 74 = 82 bytes total

#[account]
#[derive(InitSpace)]
pub struct TierCounter {
    pub tier: u8,            // 1
    pub sold: u64,           // 8
    pub bump: u8,            // 1
}
// Disc 8 + 10 = 18 bytes

/// Global protocol config. The $VAVA mint is INJECTED, never hardcoded:
/// devnet runs a stand-in SPL mint with pump.fun-identical properties
/// (6 decimals, 1B supply, mint authority revoked); on launch day the
/// real pump.fun mint is set via update_mint and sealed with lock_mint.
#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,        // 32
    pub treasury: Pubkey,     // 32
    pub keeper: Pubkey,       // 32 - buyback bot authority (Jupiter TWAP on mainnet)
    pub vava_mint: Pubkey,    // 32
    pub mint_locked: bool,    // 1  - once true, the mint can never change again
    pub bump: u8,             // 1
    pub buyback_bump: u8,     // 1  - SOL escrow PDA bump
}
// Disc 8 + 131 = 139 bytes
