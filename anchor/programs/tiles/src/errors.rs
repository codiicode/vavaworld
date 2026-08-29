use anchor_lang::prelude::*;

#[error_code]
pub enum TilesError {
    #[msg("h3_ids length out of range [1,20]")]
    BatchSizeInvalid,
    #[msg("Tile already claimed")]
    AlreadyClaimed,
    #[msg("Tile PDA does not match the expected h3_id")]
    PdaInvalid,
    #[msg("Treasury account mismatch")]
    TreasuryMismatch,
    #[msg("Total cost exceeds expected_max_total (slippage)")]
    SlippageExceeded,
    #[msg("Counter PDA mismatch for tier")]
    CounterMismatch,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Invalid h3 cell — could not derive coordinates")]
    InvalidH3,
    #[msg("Tier value out of range")]
    TierInvalid,
    #[msg("Signer is not the current owner of this tile")]
    NotOwner,
    #[msg("Invalid transfer recipient")]
    InvalidRecipient,
    #[msg("Signer is not the config admin")]
    AdminOnly,
    #[msg("Signer is not the configured keeper")]
    KeeperOnly,
    #[msg("Mint is locked and can never change")]
    MintLocked,
    #[msg("Token account mint does not match the configured mint")]
    MintMismatch,
    #[msg("Previous mint vault must be empty before switching mints")]
    VaultNotEmpty,
    #[msg("Tile has unconverted SOL pending - keeper must embed first")]
    PendingUnsettled,
    #[msg("Nothing to embed - tile has no pending SOL")]
    NothingToEmbed,
    #[msg("Price quote has expired")]
    QuoteExpired,
    #[msg("Price quote signature missing or invalid")]
    QuoteInvalid,
    #[msg("Embed amount must be greater than zero")]
    EmbedAmountZero,
    #[msg("Amount must be greater than zero")]
    AmountZero,
    #[msg("Not enough active stake")]
    InsufficientStake,
    #[msg("Unstake cooldown has not elapsed")]
    UnstakeNotReady,
    #[msg("No pending unstake to withdraw")]
    NothingPending,
}
