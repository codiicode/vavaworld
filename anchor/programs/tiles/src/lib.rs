use anchor_lang::prelude::*;

declare_id!("G8MsXTtabmQnfPd4PZ7dDLYtRPhFDqRs93ExhhsSDkwM");

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
        prices: Vec<u64>,
        quote_expiry: i64,
    ) -> Result<()> {
        claim_handler(ctx, h3_ids, prices, quote_expiry)
    }

    pub fn init_config(ctx: Context<InitConfig>, keeper: Pubkey) -> Result<()> {
        init_config_handler(ctx, keeper)
    }

    pub fn update_mint(ctx: Context<UpdateMint>) -> Result<()> {
        update_mint_handler(ctx)
    }

    pub fn update_keeper(ctx: Context<UpdateKeeper>, new_keeper: Pubkey) -> Result<()> {
        update_keeper_handler(ctx, new_keeper)
    }

    pub fn lock_mint(ctx: Context<LockMint>) -> Result<()> {
        lock_mint_handler(ctx)
    }

    pub fn embed(ctx: Context<Embed>, vava_amount: u64) -> Result<()> {
        embed_handler(ctx, vava_amount)
    }

    pub fn raze(ctx: Context<Raze>) -> Result<()> {
        raze_handler(ctx)
    }

    pub fn place_bid(ctx: Context<PlaceBid>, h3_id: u64, amount: u64) -> Result<()> {
        place_bid_handler(ctx, h3_id, amount)
    }

    pub fn cancel_bid(ctx: Context<CancelBid>, h3_id: u64) -> Result<()> {
        cancel_bid_handler(ctx, h3_id)
    }

    pub fn decline_bid(ctx: Context<DeclineBid>, h3_id: u64) -> Result<()> {
        decline_bid_handler(ctx, h3_id)
    }

    pub fn accept_bid(ctx: Context<AcceptBid>, h3_id: u64) -> Result<()> {
        accept_bid_handler(ctx, h3_id)
    }

    pub fn sync_owner(ctx: Context<SyncOwner>, h3_id: u64, new_owner: Pubkey) -> Result<()> {
        sync_owner_handler(ctx, h3_id, new_owner)
    }

    pub fn init_stake_vault(ctx: Context<InitStakeVault>) -> Result<()> {
        init_stake_vault_handler(ctx)
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        stake_handler(ctx, amount)
    }

    pub fn begin_unstake(ctx: Context<BeginUnstake>, amount: u64) -> Result<()> {
        begin_unstake_handler(ctx, amount)
    }

    pub fn withdraw_unstaked(ctx: Context<WithdrawUnstaked>) -> Result<()> {
        withdraw_unstaked_handler(ctx)
    }
}
