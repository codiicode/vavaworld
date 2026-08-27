use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer as SplTransfer};

use crate::errors::TilesError;
use crate::state::{Config, Tile};

/// Keeper settles a tile's escrowed buyback SOL into embedded $VAVA.
///
/// The keeper (our bot; Jupiter TWAP on mainnet, test pool on devnet)
/// buys $VAVA on the open market with its own funds, then calls this:
/// the tokens move keeper → program vault, the tile is credited, and
/// the escrowed SOL reimburses the keeper. The exchange rate is
/// whatever the keeper achieved on-market; the keeper is config-gated
/// and can only ever receive exactly the escrowed lamports.
#[derive(Accounts)]
pub struct Embed<'info> {
    #[account(mut, address = config.keeper @ TilesError::KeeperOnly)]
    pub keeper: Signer<'info>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,

    #[account(
        mut,
        seeds = [b"tile", &tile.h3_id.to_le_bytes()],
        bump = tile.bump,
    )]
    pub tile: Box<Account<'info, Tile>>,

    /// CHECK: buyback SOL escrow PDA; lamports only.
    #[account(mut, seeds = [b"buyback"], bump = config.buyback_bump)]
    pub buyback_vault: SystemAccount<'info>,

    #[account(
        mut,
        constraint = keeper_token.mint == config.vava_mint @ TilesError::MintMismatch,
        constraint = keeper_token.owner == keeper.key() @ TilesError::KeeperOnly,
    )]
    pub keeper_token: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"vault", config.vava_mint.as_ref()],
        bump,
    )]
    pub vava_vault: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    // Needed for the escrow -> keeper SOL reimbursement CPI.
    pub system_program: Program<'info, System>,
}

pub fn embed_handler(ctx: Context<Embed>, vava_amount: u64) -> Result<()> {
    require!(vava_amount > 0, TilesError::EmbedAmountZero);
    let pending = ctx.accounts.tile.pending_sol;
    require!(pending > 0, TilesError::NothingToEmbed);

    // Tokens: keeper -> program vault.
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            SplTransfer {
                from: ctx.accounts.keeper_token.to_account_info(),
                to: ctx.accounts.vava_vault.to_account_info(),
                authority: ctx.accounts.keeper.to_account_info(),
            },
        ),
        vava_amount,
    )?;

    // Reimbursement: escrowed SOL -> keeper. PDA signs with its seeds.
    let bump = ctx.accounts.config.buyback_bump;
    let seeds: &[&[&[u8]]] = &[&[b"buyback", &[bump]]];
    anchor_lang::solana_program::program::invoke_signed(
        &anchor_lang::solana_program::system_instruction::transfer(
            &ctx.accounts.buyback_vault.key(),
            &ctx.accounts.keeper.key(),
            pending,
        ),
        &[
            ctx.accounts.buyback_vault.to_account_info(),
            ctx.accounts.keeper.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        seeds,
    )?;

    let tile = &mut ctx.accounts.tile;
    tile.embedded_vava = tile
        .embedded_vava
        .checked_add(vava_amount)
        .ok_or(TilesError::Overflow)?;
    tile.pending_sol = 0;
    Ok(())
}
