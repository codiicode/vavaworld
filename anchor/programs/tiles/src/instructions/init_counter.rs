use anchor_lang::prelude::*;

use crate::constants::TREASURY;
use crate::errors::TilesError;
use crate::state::TierCounter;

#[derive(Accounts)]
#[instruction(tier: u8)]
pub struct InitCounter<'info> {
    #[account(mut, address = TREASURY @ TilesError::TreasuryMismatch)]
    pub admin: Signer<'info>,

    #[account(
        init,
        seeds = [b"counter".as_ref(), &[tier]],
        bump,
        payer = admin,
        space = 8 + TierCounter::INIT_SPACE,
    )]
    pub counter: Account<'info, TierCounter>,

    pub system_program: Program<'info, System>,
}

pub fn init_counter_handler(ctx: Context<InitCounter>, tier: u8) -> Result<()> {
    require!(tier >= 1 && tier <= 3, TilesError::TierInvalid);

    let counter = &mut ctx.accounts.counter;
    counter.tier = tier;
    counter.sold = 0;
    counter.bump = ctx.bumps.counter;

    Ok(())
}
