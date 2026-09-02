-- Applied to the vavaworld project on 2026-09-02 (Supabase migration
-- "history_tables_keep_h3_without_fk").
--
-- Sales, listings and bids are HISTORY keyed by the stable hex id. A razed
-- hex leaves the registry (and may be claimed again later), so history
-- must not pin the registry row in place.

alter table if exists sales drop constraint if exists sales_h3_id_fkey;
alter table if exists listings drop constraint if exists listings_h3_id_fkey;
alter table if exists bids drop constraint if exists bids_h3_id_fkey;
