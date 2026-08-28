use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer as SplTransfer};

use crate::constants::UNSTAKE_DELAY_SECS;
use crate::errors::TilesError;
use crate::state::{Config, StakeAccount};

/// Stake $VAVA: tokens move wallet → program stake vault. Tier
/// thresholds (Citizen 250k / Baron 500k / President 1M) live in the
/// consumers, not here - the program only tracks amounts.
#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,

    #[account(
        init_if_needed,
        seeds = [b"stake", owner.key().as_ref()],
        bump,
        payer = owner,
        space = 8 + StakeAccount::INIT_SPACE,
    )]
    pub stake_account: Box<Account<'info, StakeAccount>>,

    #[account(
        mut,
        constraint = owner_token.mint == config.vava_mint @ TilesError::MintMismatch,
        constraint = owner_token.owner == owner.key() @ TilesError::NotOwner,
    )]
    pub owner_token: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"stake_vault", config.vava_mint.as_ref()],
        bump,
    )]
    pub stake_vault: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn stake_handler(ctx: Context<Stake>, amount: u64) -> Result<()> {
    require!(amount > 0, TilesError::AmountZero);

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.key(),
            SplTransfer {
                from: ctx.accounts.owner_token.to_account_info(),
                to: ctx.accounts.stake_vault.to_account_info(),
                authority: ctx.accounts.owner.to_account_info(),
            },
        ),
        amount,
    )?;

    let s = &mut ctx.accounts.stake_account;
    s.owner = ctx.accounts.owner.key();
    s.amount = s.amount.checked_add(amount).ok_or(TilesError::Overflow)?;
    s.bump = ctx.bumps.stake_account;
    Ok(())
}

/// Start the unstake cooldown for part or all of the active stake.
/// Resets the 24h clock for the entire pending amount - documented
/// behavior, keeps the account model trivial.
#[derive(Accounts)]
pub struct BeginUnstake<'info> {
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"stake", owner.key().as_ref()],
        bump = stake_account.bump,
        constraint = stake_account.owner == owner.key() @ TilesError::NotOwner,
    )]
    pub stake_account: Box<Account<'info, StakeAccount>>,
}

pub fn begin_unstake_handler(ctx: Context<BeginUnstake>, amount: u64) -> Result<()> {
    require!(amount > 0, TilesError::AmountZero);
    let s = &mut ctx.accounts.stake_account;
    require!(s.amount >= amount, TilesError::InsufficientStake);
    s.amount -= amount;
    s.pending_amount = s
        .pending_amount
        .checked_add(amount)
        .ok_or(TilesError::Overflow)?;
    s.unstake_available_at = Clock::get()?
        .unix_timestamp
        .checked_add(UNSTAKE_DELAY_SECS)
        .ok_or(TilesError::Overflow)?;
    Ok(())
}

/// Release the pending amount after the cooldown has elapsed.
#[derive(Accounts)]
pub struct WithdrawUnstaked<'info> {
    pub owner: Signer<'info>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,

    #[account(
        mut,
        seeds = [b"stake", owner.key().as_ref()],
        bump = stake_account.bump,
        constraint = stake_account.owner == owner.key() @ TilesError::NotOwner,
    )]
    pub stake_account: Box<Account<'info, StakeAccount>>,

    #[account(
        mut,
        constraint = owner_token.mint == config.vava_mint @ TilesError::MintMismatch,
        constraint = owner_token.owner == owner.key() @ TilesError::NotOwner,
    )]
    pub owner_token: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"stake_vault", config.vava_mint.as_ref()],
        bump,
    )]
    pub stake_vault: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
}

pub fn withdraw_unstaked_handler(ctx: Context<WithdrawUnstaked>) -> Result<()> {
    let s = &ctx.accounts.stake_account;
    require!(s.pending_amount > 0, TilesError::NothingPending);
    require!(
        Clock::get()?.unix_timestamp >= s.unstake_available_at,
        TilesError::UnstakeNotReady
    );
    let amount = s.pending_amount;

    let bump = ctx.accounts.config.bump;
    let seeds: &[&[&[u8]]] = &[&[b"config", &[bump]]];
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.key(),
            SplTransfer {
                from: ctx.accounts.stake_vault.to_account_info(),
                to: ctx.accounts.owner_token.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            seeds,
        ),
        amount,
    )?;

    let s = &mut ctx.accounts.stake_account;
    s.pending_amount = 0;
    s.unstake_available_at = 0;
    Ok(())
}

/// One-time init of the stake vault for the configured mint (admin).
/// Separate from init_config so the already-initialized devnet config
/// doesn't need a re-deploy dance.
#[derive(Accounts)]
pub struct InitStakeVault<'info> {
    #[account(mut, address = config.admin @ TilesError::AdminOnly)]
    pub admin: Signer<'info>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,

    /// CHECK: mint checked against config below.
    #[account(address = config.vava_mint @ TilesError::MintMismatch)]
    pub vava_mint: Box<Account<'info, anchor_spl::token::Mint>>,

    #[account(
        init,
        seeds = [b"stake_vault", vava_mint.key().as_ref()],
        bump,
        payer = admin,
        token::mint = vava_mint,
        token::authority = config,
    )]
    pub stake_vault: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn init_stake_vault_handler(_ctx: Context<InitStakeVault>) -> Result<()> {
    Ok(())
}
