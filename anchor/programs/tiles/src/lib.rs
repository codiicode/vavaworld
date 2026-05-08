use anchor_lang::prelude::*;

declare_id!("GNfEEPYES1k2sZnoBfWbA51zYZVSyeB46te6EyL8CzBt");

pub mod constants;
pub mod errors;
pub mod h3_coords;
pub mod instructions;
pub mod state;
pub mod tier;

use instructions::*;

#[program]
pub mod tiles {
    use super::*;

    pub fn init_counter(ctx: Context<InitCounter>, tier: u8) -> Result<()> {
        init_counter_handler(ctx, tier)
    }

    pub fn claim<'info>(
        ctx: Context<'info, Claim<'info>>,
        h3_ids: Vec<u64>,
        expected_max_total: u64,
    ) -> Result<()> {
        claim_handler(ctx, h3_ids, expected_max_total)
    }
}
