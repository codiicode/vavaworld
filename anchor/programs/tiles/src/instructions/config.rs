use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::TREASURY;
use crate::errors::TilesError;
use crate::state::Config;

/// One-time protocol config init. The admin is pinned to the TREASURY
/// authority; the mint is whatever SPL mint is passed (devnet stand-in
/// now, the pump.fun mint on launch day via update_mint).
#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(mut, address = TREASURY @ TilesError::AdminOnly)]
    pub admin: Signer<'info>,

    #[account(
        init,
        seeds = [b"config"],
        bump,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
    )]
    pub config: Box<Account<'info, Config>>,

    /// SOL escrow for the 15% buyback share. A data-less system PDA;
    /// funded here to rent exemption so small transfers never fail.
    /// CHECK: PDA derived from the buyback seed, holds lamports only.
    #[account(mut, seeds = [b"buyback"], bump)]
    pub buyback_vault: SystemAccount<'info>,

    pub vava_mint: Box<Account<'info, Mint>>,

    /// Program-owned token vault for the configured mint. Holds every
    /// hex's embedded $VAVA. Authority = config PDA.
    #[account(
        init,
        seeds = [b"vault", vava_mint.key().as_ref()],
        bump,
        payer = admin,
        token::mint = vava_mint,
        token::authority = config,
    )]
    pub vava_vault: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn init_config_handler(ctx: Context<InitConfig>, keeper: Pubkey) -> Result<()> {
    let config = &mut ctx.accounts.config;
    config.admin = ctx.accounts.admin.key();
    config.treasury = TREASURY;
    config.keeper = keeper;
    config.vava_mint = ctx.accounts.vava_mint.key();
    config.mint_locked = false;
    config.bump = ctx.bumps.config;
    config.buyback_bump = ctx.bumps.buyback_vault;

    // Make the buyback escrow rent-exempt up front.
    let rent = Rent::get()?.minimum_balance(0);
    if ctx.accounts.buyback_vault.lamports() < rent {
        let top_up = rent - ctx.accounts.buyback_vault.lamports();
        anchor_lang::solana_program::program::invoke(
            &anchor_lang::solana_program::system_instruction::transfer(
                &ctx.accounts.admin.key(),
                &ctx.accounts.buyback_vault.key(),
                top_up,
            ),
            &[
                ctx.accounts.admin.to_account_info(),
                ctx.accounts.buyback_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
    }
    Ok(())
}

/// Swap the configured mint (launch day: point at the real pump.fun
/// mint). Requires: admin, mint not locked, and the OLD vault empty so
/// no embedded tokens are ever stranded. Creates the vault for the new
/// mint in the same transaction.
#[derive(Accounts)]
pub struct UpdateMint<'info> {
    #[account(mut, address = config.admin @ TilesError::AdminOnly)]
    pub admin: Signer<'info>,

    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,

    #[account(
        seeds = [b"vault", config.vava_mint.as_ref()],
        bump,
        constraint = old_vault.amount == 0 @ TilesError::VaultNotEmpty,
    )]
    pub old_vault: Box<Account<'info, TokenAccount>>,

    pub new_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        seeds = [b"vault", new_mint.key().as_ref()],
        bump,
        payer = admin,
        token::mint = new_mint,
        token::authority = config,
    )]
    pub new_vault: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn update_mint_handler(ctx: Context<UpdateMint>) -> Result<()> {
    let config = &mut ctx.accounts.config;
    require!(!config.mint_locked, TilesError::MintLocked);
    config.vava_mint = ctx.accounts.new_mint.key();
    Ok(())
}

/// Permanently seal the mint choice. Run right after pointing the
/// config at the real pump.fun mint. There is no unlock.
#[derive(Accounts)]
pub struct LockMint<'info> {
    #[account(address = config.admin @ TilesError::AdminOnly)]
    pub admin: Signer<'info>,

    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,
}

pub fn lock_mint_handler(ctx: Context<LockMint>) -> Result<()> {
    ctx.accounts.config.mint_locked = true;
    Ok(())
}
