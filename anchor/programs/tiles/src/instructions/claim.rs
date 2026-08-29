use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    program::{invoke, invoke_signed},
    system_instruction,
};

use solana_instructions_sysvar::load_instruction_at_checked;
use solana_sdk_ids::ed25519_program;
use solana_sha256_hasher::hashv;

use crate::constants::{BPS_DENOMINATOR, EMBEDDED_BPS, MAX_TILES_PER_TX, TREASURY};
use crate::errors::TilesError;
use crate::h3_coords::h3_to_latlng_microdeg;
use crate::state::{Config, Tile, TierCounter};
use crate::tier::classify_tier;

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub claimer: Signer<'info>,

    /// CHECK: validated against TREASURY const
    #[account(mut, address = TREASURY @ TilesError::TreasuryMismatch)]
    pub treasury: SystemAccount<'info>,

    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Box<Account<'info, Config>>,

    /// CHECK: buyback SOL escrow PDA; receives the 15% embedded share.
    #[account(mut, seeds = [b"buyback"], bump = config.buyback_bump)]
    pub buyback_vault: SystemAccount<'info>,

    #[account(
        mut,
        seeds = [b"counter".as_ref(), &[1u8]],
        bump = t1_counter.bump,
    )]
    pub t1_counter: Box<Account<'info, TierCounter>>,

    #[account(
        mut,
        seeds = [b"counter".as_ref(), &[2u8]],
        bump = t2_counter.bump,
    )]
    pub t2_counter: Box<Account<'info, TierCounter>>,

    #[account(
        mut,
        seeds = [b"counter".as_ref(), &[3u8]],
        bump = t3_counter.bump,
    )]
    pub t3_counter: Box<Account<'info, TierCounter>>,

    /// CHECK: the instructions sysvar, address-checked; read to verify the
    /// keeper's ed25519 price-quote signature in this transaction.
    #[account(address = solana_sdk_ids::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    // Tile PDAs come via ctx.remaining_accounts in the same order as h3_ids
}

/// Domain separator for quote messages - bump on any format change.
const QUOTE_DOMAIN: &[u8] = b"VAVA_CLAIM_V1";

pub fn claim_handler<'info>(
    ctx: Context<'info, Claim<'info>>,
    h3_ids: Vec<u64>,
    prices: Vec<u64>,
    quote_expiry: i64,
) -> Result<()> {
    // ---- Validation ----
    require!(
        !h3_ids.is_empty() && h3_ids.len() <= MAX_TILES_PER_TX,
        TilesError::BatchSizeInvalid
    );
    require!(prices.len() == h3_ids.len(), TilesError::QuoteInvalid);
    require!(
        ctx.remaining_accounts.len() == h3_ids.len(),
        TilesError::PdaInvalid
    );

    let now = Clock::get()?.unix_timestamp;
    require!(now <= quote_expiry, TilesError::QuoteExpired);
    let claimer_key = ctx.accounts.claimer.key();
    let program_id = ctx.program_id;

    // ---- Verify the keeper-signed price quote ----
    // Primary-claim pricing is the per-country USD curve, which lives
    // off-chain. The server (keeper key) signs sha256(domain, claimer,
    // expiry, h3s, prices) and the client prepends an ed25519-program
    // instruction carrying that signature. Without a valid quote the
    // program rejects the claim, so nobody can settle land outside the
    // official pricing.
    {
        let mut msg: Vec<u8> = Vec::with_capacity(13 + 32 + 8 + h3_ids.len() * 16);
        msg.extend_from_slice(QUOTE_DOMAIN);
        msg.extend_from_slice(claimer_key.as_ref());
        msg.extend_from_slice(&quote_expiry.to_le_bytes());
        for (h3, price) in h3_ids.iter().zip(prices.iter()) {
            msg.extend_from_slice(&h3.to_le_bytes());
            msg.extend_from_slice(&price.to_le_bytes());
        }
        let expected_hash = hashv(&[&msg]).to_bytes();

        let ix = load_instruction_at_checked(0, &ctx.accounts.instructions_sysvar)
            .map_err(|_| TilesError::QuoteInvalid)?;
        require_keys_eq!(ix.program_id, ed25519_program::ID, TilesError::QuoteInvalid);
        let d = &ix.data;
        // ed25519 single-signature layout: 2-byte header + 7 u16 fields.
        require!(d.len() >= 16 && d[0] == 1, TilesError::QuoteInvalid);
        let rd_u16 = |off: usize| u16::from_le_bytes([d[off], d[off + 1]]) as usize;
        let sig_ix_idx = rd_u16(4);
        let pk_off = rd_u16(6);
        let pk_ix_idx = rd_u16(8);
        let msg_off = rd_u16(10);
        let msg_len = rd_u16(12);
        let msg_ix_idx = rd_u16(14);
        // All references must point into THIS ed25519 instruction's own data.
        let same = u16::MAX as usize;
        require!(
            sig_ix_idx == same && pk_ix_idx == same && msg_ix_idx == same,
            TilesError::QuoteInvalid
        );
        require!(msg_len == 32 && d.len() >= msg_off + 32, TilesError::QuoteInvalid);
        require!(d.len() >= pk_off + 32, TilesError::QuoteInvalid);
        require!(
            d[pk_off..pk_off + 32] == ctx.accounts.config.keeper.to_bytes(),
            TilesError::QuoteInvalid
        );
        require!(d[msg_off..msg_off + 32] == expected_hash, TilesError::QuoteInvalid);
    }

    // ---- Pass 1: validate PDAs, classify tier, sum the quoted prices ----
    let mut tiers: Vec<u8> = Vec::with_capacity(h3_ids.len());
    let mut bumps: Vec<u8> = Vec::with_capacity(h3_ids.len());
    let mut total: u64 = 0;

    for (i, &h3_id) in h3_ids.iter().enumerate() {
        let tile_acc = &ctx.remaining_accounts[i];

        // Re-derive PDA + verify match
        let (expected_pda, bump) =
            Pubkey::find_program_address(&[b"tile", &h3_id.to_le_bytes()], program_id);
        require_keys_eq!(*tile_acc.key, expected_pda, TilesError::PdaInvalid);

        // Must be uninitialized
        require!(
            tile_acc.lamports() == 0 && tile_acc.data_is_empty(),
            TilesError::AlreadyClaimed,
        );
        // Classify tier (recorded on the tile + drives the counters)
        let (lat, lng) = h3_to_latlng_microdeg(h3_id).ok_or(TilesError::InvalidH3)?;
        let tier = classify_tier(lat, lng);
        require!((1..=3).contains(&tier), TilesError::TierInvalid);

        total = total
            .checked_add(prices[i])
            .ok_or(TilesError::Overflow)?;

        tiers.push(tier);
        bumps.push(bump);
    }

    // ---- Revenue split (docs/tokenomics.md waterfall) ----
    // Per-tile: 15% escrowed for the $VAVA buyback (embedded in the hex
    // by the keeper), the rest to treasury. The president's 5% also
    // falls to treasury until the throne system ships.
    let mut embeds: Vec<u64> = Vec::with_capacity(prices.len());
    let mut total_embed: u64 = 0;
    for &price in prices.iter() {
        let e = price
            .checked_mul(EMBEDDED_BPS)
            .ok_or(TilesError::Overflow)?
            / BPS_DENOMINATOR;
        total_embed = total_embed.checked_add(e).ok_or(TilesError::Overflow)?;
        embeds.push(e);
    }
    let treasury_amount = total.checked_sub(total_embed).ok_or(TilesError::Overflow)?;

    // ---- Transfer SOL claimer → treasury + buyback escrow ----
    let transfer_ix =
        system_instruction::transfer(&claimer_key, ctx.accounts.treasury.key, treasury_amount);
    invoke(
        &transfer_ix,
        &[
            ctx.accounts.claimer.to_account_info(),
            ctx.accounts.treasury.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;
    if total_embed > 0 {
        let escrow_ix = system_instruction::transfer(
            &claimer_key,
            ctx.accounts.buyback_vault.key,
            total_embed,
        );
        invoke(
            &escrow_ix,
            &[
                ctx.accounts.claimer.to_account_info(),
                ctx.accounts.buyback_vault.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ],
        )?;
    }

    // ---- Pass 2: create Tile PDAs and write data ----
    let space = 8 + Tile::INIT_SPACE;
    let rent = Rent::get()?.minimum_balance(space);

    for (i, &h3_id) in h3_ids.iter().enumerate() {
        let tile_acc = &ctx.remaining_accounts[i];
        let bump = bumps[i];
        let tier = tiers[i];
        let price = prices[i];
        let h3_bytes = h3_id.to_le_bytes();

        let create_ix = system_instruction::create_account(
            &claimer_key,
            tile_acc.key,
            rent,
            space as u64,
            program_id,
        );
        let signer_seeds: &[&[&[u8]]] = &[&[b"tile", h3_bytes.as_ref(), &[bump]]];

        invoke_signed(
            &create_ix,
            &[
                ctx.accounts.claimer.to_account_info(),
                tile_acc.clone(),
                ctx.accounts.system_program.to_account_info(),
            ],
            signer_seeds,
        )?;

        // Initialize Tile data: 8-byte discriminator + serialized struct
        let tile = Tile {
            owner: claimer_key,
            h3_id,
            claimed_at: now,
            tier,
            price_paid: price,
            bump,
            pending_sol: embeds[i],
            embedded_vava: 0,
        };

        let mut data = tile_acc.try_borrow_mut_data()?;
        data[..8].copy_from_slice(&Tile::DISCRIMINATOR);
        let mut writer: &mut [u8] = &mut data[8..];
        tile.serialize(&mut writer)?;
    }

    // ---- Increment counters ----
    let t1_added: u64 = tiers.iter().filter(|&&t| t == 1).count() as u64;
    let t2_added: u64 = tiers.iter().filter(|&&t| t == 2).count() as u64;
    let t3_added: u64 = tiers.iter().filter(|&&t| t == 3).count() as u64;

    ctx.accounts.t1_counter.sold = ctx
        .accounts
        .t1_counter
        .sold
        .checked_add(t1_added)
        .ok_or(TilesError::Overflow)?;
    ctx.accounts.t2_counter.sold = ctx
        .accounts
        .t2_counter
        .sold
        .checked_add(t2_added)
        .ok_or(TilesError::Overflow)?;
    ctx.accounts.t3_counter.sold = ctx
        .accounts
        .t3_counter
        .sold
        .checked_add(t3_added)
        .ok_or(TilesError::Overflow)?;

    Ok(())
}
