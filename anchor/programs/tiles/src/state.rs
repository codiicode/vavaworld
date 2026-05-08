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
}
// Anchor disc 8 + fields 58 = 66 bytes total

#[account]
#[derive(InitSpace)]
pub struct TierCounter {
    pub tier: u8,            // 1
    pub sold: u64,           // 8
    pub bump: u8,            // 1
}
// Disc 8 + 10 = 18 bytes
