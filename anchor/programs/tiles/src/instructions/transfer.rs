use anchor_lang::prelude::*;

use crate::errors::TilesError;
use crate::state::Tile;

/// Hand a claimed tile to another wallet. Only the current owner can sign.
/// The Tile PDA address is constrained by its own `h3_id` + `bump` so a
/// caller can't pass a forged account.
#[derive(Accounts)]
pub struct Transfer<'info> {
    #[account(
        mut,
        seeds = [b"tile", &tile.h3_id.to_le_bytes()],
        bump = tile.bump,
        has_one = owner @ TilesError::NotOwner,
    )]
    pub tile: Account<'info, Tile>,

    pub owner: Signer<'info>,
}

pub fn transfer_handler(ctx: Context<Transfer>, recipient: Pubkey) -> Result<()> {
    require!(recipient != Pubkey::default(), TilesError::InvalidRecipient);
    let tile = &mut ctx.accounts.tile;
    require!(recipient != tile.owner, TilesError::InvalidRecipient);
    tile.owner = recipient;
    Ok(())
}
