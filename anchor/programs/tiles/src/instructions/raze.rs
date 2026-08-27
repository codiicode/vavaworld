use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, Token, TokenAccount, Transfer as SplTransfer};

use crate::constants::{BPS_DENOMINATOR, RAZE_HAIRCUT_BPS};
use crate::errors::TilesError;
use crate::state::{Config, Tile};

/// Destroy a hex to extract its embedded $VAVA. The owner receives the
/// embedded amount minus the haircut (burned), the tile account closes
/// (rent back to the owner), and the land returns to unclaimed - fully
/// re-claimable at the current primary price.
///
/// Requires the keeper to have settled any pending buyback SOL first:
/// razing with pending escrow would strand the escrowed lamports.
#[derive(Accounts)]
pub struct Raze<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"tile", &tile.h3_id.to_le_bytes()],
        bump = tile.bump,
        has_one = owner @ TilesError::NotOwner,
        close = owner,
        constraint = tile.pending_sol == 0 @ TilesError::PendingUnsettled,
    )]
    pub tile: Box<Account<'info, Tile>>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,

    #[account(
        mut,
        address = config.vava_mint @ TilesError::MintMismatch,
    )]
    pub vava_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [b"vault", config.vava_mint.as_ref()],
        bump,
    )]
    pub vava_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = owner_token.mint == config.vava_mint @ TilesError::MintMismatch,
        constraint = owner_token.owner == owner.key() @ TilesError::NotOwner,
    )]
    pub owner_token: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

pub fn raze_handler(ctx: Context<Raze>) -> Result<()> {
    let embedded = ctx.accounts.tile.embedded_vava;

    // Pre-v2 tiles (or unsettled zero-embed edge) simply return the land.
    if embedded == 0 {
        return Ok(());
    }

    let haircut = embedded
        .checked_mul(RAZE_HAIRCUT_BPS)
        .ok_or(TilesError::Overflow)?
        / BPS_DENOMINATOR;
    let payout = embedded.checked_sub(haircut).ok_or(TilesError::Overflow)?;

    let config_bump = ctx.accounts.config.bump;
    let seeds: &[&[&[u8]]] = &[&[b"config", &[config_bump]]];

    if payout > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                SplTransfer {
                    from: ctx.accounts.vava_vault.to_account_info(),
                    to: ctx.accounts.owner_token.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                seeds,
            ),
            payout,
        )?;
    }

    if haircut > 0 {
        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Burn {
                    mint: ctx.accounts.vava_mint.to_account_info(),
                    from: ctx.accounts.vava_vault.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                seeds,
            ),
            haircut,
        )?;
    }

    Ok(())
}
