use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke, system_instruction};

use crate::constants::{
    BARON_STAKE_THRESHOLD, BPS_DENOMINATOR, SECONDARY_FEE_BPS_BARON,
    SECONDARY_FEE_BPS_STANDARD, TREASURY,
};
use crate::errors::TilesError;
use crate::state::{BidEscrow, Config, StakeAccount, Tile};

/// Place (or update) an offer on a claimed hex. The offered SOL moves
/// into the bid PDA immediately - an empty wallet cannot bid, and the
/// funds stay locked until accept (settlement), decline, or cancel
/// (refund). Re-bidding adjusts the escrow by the difference.
#[derive(Accounts)]
#[instruction(h3_id: u64)]
pub struct PlaceBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,

    #[account(
        seeds = [b"tile", &h3_id.to_le_bytes()],
        bump = tile.bump,
        constraint = tile.owner != bidder.key() @ TilesError::SelfBid,
    )]
    pub tile: Box<Account<'info, Tile>>,

    #[account(
        init_if_needed,
        seeds = [b"bid".as_ref(), &h3_id.to_le_bytes(), bidder.key().as_ref()],
        bump,
        payer = bidder,
        space = 8 + BidEscrow::INIT_SPACE,
    )]
    pub bid_escrow: Box<Account<'info, BidEscrow>>,

    pub system_program: Program<'info, System>,
}

pub fn place_bid_handler(ctx: Context<PlaceBid>, h3_id: u64, amount: u64) -> Result<()> {
    require!(amount > 0, TilesError::AmountZero);

    let old = ctx.accounts.bid_escrow.amount;
    if amount > old {
        let diff = amount - old;
        let ix = system_instruction::transfer(
            &ctx.accounts.bidder.key(),
            &ctx.accounts.bid_escrow.key(),
            diff,
        );
        invoke(
            &ix,
            &[
                ctx.accounts.bidder.to_account_info(),
                ctx.accounts.bid_escrow.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
    } else if amount < old {
        // Lowering the offer refunds the difference. The escrow PDA is
        // program-owned, so it is debited directly.
        let diff = old - amount;
        **ctx
            .accounts
            .bid_escrow
            .to_account_info()
            .try_borrow_mut_lamports()? -= diff;
        **ctx.accounts.bidder.to_account_info().try_borrow_mut_lamports()? += diff;
    }

    let escrow = &mut ctx.accounts.bid_escrow;
    escrow.bidder = ctx.accounts.bidder.key();
    escrow.h3_id = h3_id;
    escrow.amount = amount;
    escrow.created_at = Clock::get()?.unix_timestamp;
    escrow.bump = ctx.bumps.bid_escrow;
    Ok(())
}

/// Bidder withdraws their offer - closing the escrow refunds the full
/// amount plus rent in one move.
#[derive(Accounts)]
#[instruction(h3_id: u64)]
pub struct CancelBid<'info> {
    #[account(mut)]
    pub bidder: Signer<'info>,

    #[account(
        mut,
        seeds = [b"bid".as_ref(), &h3_id.to_le_bytes(), bidder.key().as_ref()],
        bump = bid_escrow.bump,
        has_one = bidder @ TilesError::NotOwner,
        close = bidder,
    )]
    pub bid_escrow: Box<Account<'info, BidEscrow>>,
}

pub fn cancel_bid_handler(_ctx: Context<CancelBid>, _h3_id: u64) -> Result<()> {
    Ok(())
}

/// Tile owner declines an offer - the bidder is refunded automatically
/// (escrow closes back to them).
#[derive(Accounts)]
#[instruction(h3_id: u64)]
pub struct DeclineBid<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"tile", &h3_id.to_le_bytes()],
        bump = tile.bump,
        has_one = owner @ TilesError::NotOwner,
    )]
    pub tile: Box<Account<'info, Tile>>,

    /// CHECK: refund target, must match the escrow's recorded bidder.
    #[account(mut, address = bid_escrow.bidder @ TilesError::PdaInvalid)]
    pub bidder: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"bid".as_ref(), &h3_id.to_le_bytes(), bidder.key().as_ref()],
        bump = bid_escrow.bump,
        close = bidder,
    )]
    pub bid_escrow: Box<Account<'info, BidEscrow>>,
}

pub fn decline_bid_handler(_ctx: Context<DeclineBid>, _h3_id: u64) -> Result<()> {
    Ok(())
}

/// Tile owner accepts an offer: one atomic transaction pays the seller
/// (95%, or 97% for baron-staked sellers), routes the fee to treasury
/// (president's 1% included until thrones settle on-chain), hands the
/// tile to the bidder, and returns the escrow rent to them. Embedded
/// $VAVA and pending buyback SOL travel with the tile.
#[derive(Accounts)]
#[instruction(h3_id: u64)]
pub struct AcceptBid<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        seeds = [b"tile", &h3_id.to_le_bytes()],
        bump = tile.bump,
        has_one = owner @ TilesError::NotOwner,
    )]
    pub tile: Box<Account<'info, Tile>>,

    /// CHECK: settlement + refund target, must match the escrow's bidder.
    #[account(mut, address = bid_escrow.bidder @ TilesError::PdaInvalid)]
    pub bidder: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"bid".as_ref(), &h3_id.to_le_bytes(), bidder.key().as_ref()],
        bump = bid_escrow.bump,
        close = bidder,
    )]
    pub bid_escrow: Box<Account<'info, BidEscrow>>,

    /// CHECK: validated against TREASURY const
    #[account(mut, address = TREASURY @ TilesError::TreasuryMismatch)]
    pub treasury: AccountInfo<'info>,

    /// CHECK: the seller's stake PDA - address-enforced below; may be
    /// uninitialized (no stake = standard fee).
    pub seller_stake: AccountInfo<'info>,
}

pub fn accept_bid_handler(ctx: Context<AcceptBid>, _h3_id: u64) -> Result<()> {
    let amount = ctx.accounts.bid_escrow.amount;
    require!(amount > 0, TilesError::BidEmpty);

    // Fee tier from the seller's on-chain stake. The stake PDA address
    // is always enforced so a caller can't pass someone else's account.
    let (stake_pda, _) = Pubkey::find_program_address(
        &[b"stake", ctx.accounts.owner.key().as_ref()],
        ctx.program_id,
    );
    require_keys_eq!(
        ctx.accounts.seller_stake.key(),
        stake_pda,
        TilesError::PdaInvalid
    );
    let mut fee_bps = SECONDARY_FEE_BPS_STANDARD;
    if ctx.accounts.seller_stake.owner == ctx.program_id
        && !ctx.accounts.seller_stake.data_is_empty()
    {
        // Manual decode (8 disc + 32 owner + 8 amount LE) - the PDA
        // address is already enforced above.
        let data = ctx.accounts.seller_stake.try_borrow_data()?;
        if data.len() >= 48 && data[..8] == *StakeAccount::DISCRIMINATOR {
            let staked = u64::from_le_bytes(data[40..48].try_into().unwrap());
            if staked >= BARON_STAKE_THRESHOLD {
                fee_bps = SECONDARY_FEE_BPS_BARON;
            }
        }
    }

    let fee = amount
        .checked_mul(fee_bps)
        .ok_or(TilesError::Overflow)?
        / BPS_DENOMINATOR;
    let seller_amount = amount.checked_sub(fee).ok_or(TilesError::Overflow)?;

    // Split the escrowed lamports; the rent floor stays for `close` to
    // sweep back to the bidder.
    **ctx
        .accounts
        .bid_escrow
        .to_account_info()
        .try_borrow_mut_lamports()? -= amount;
    **ctx.accounts.owner.to_account_info().try_borrow_mut_lamports()? += seller_amount;
    **ctx.accounts.treasury.try_borrow_mut_lamports()? += fee;

    // Ownership flips in the same transaction the money moves.
    ctx.accounts.tile.owner = ctx.accounts.bid_escrow.bidder;
    Ok(())
}

/// Keeper-only ownership sync. Marketplace listing sales settle through
/// verified wallet transfers + the database today; this keeps the
/// on-chain tile owner matching after such a sale so accept_bid's
/// has_one check can never be satisfied by a stale previous owner.
/// Replaced by fully on-chain listings later.
#[derive(Accounts)]
#[instruction(h3_id: u64)]
pub struct SyncOwner<'info> {
    pub keeper: Signer<'info>,

    #[account(
        seeds = [b"config"],
        bump = config.bump,
        constraint = config.keeper == keeper.key() @ TilesError::KeeperOnly,
    )]
    pub config: Box<Account<'info, Config>>,

    #[account(
        mut,
        seeds = [b"tile", &h3_id.to_le_bytes()],
        bump = tile.bump,
    )]
    pub tile: Box<Account<'info, Tile>>,
}

pub fn sync_owner_handler(ctx: Context<SyncOwner>, _h3_id: u64, new_owner: Pubkey) -> Result<()> {
    ctx.accounts.tile.owner = new_owner;
    Ok(())
}
