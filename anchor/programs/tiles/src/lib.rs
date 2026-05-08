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
}
