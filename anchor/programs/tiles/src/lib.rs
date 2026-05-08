use anchor_lang::prelude::*;

declare_id!("GNfEEPYES1k2sZnoBfWbA51zYZVSyeB46te6EyL8CzBt");

pub mod constants;
pub mod errors;
pub mod h3_coords;
pub mod state;
pub mod tier;

#[program]
pub mod tiles {
    use super::*;
}
