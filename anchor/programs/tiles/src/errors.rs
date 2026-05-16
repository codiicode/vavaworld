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
}
