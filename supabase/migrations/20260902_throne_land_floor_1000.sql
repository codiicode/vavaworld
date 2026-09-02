-- Applied 2026-09-02 (Supabase migration "throne_land_floor_1000").
-- Presidency land requirement raised to a flat 1000 hexes per nation.
create or replace function public.throne_land_floor(p_iso text)
returns bigint
language sql
stable
as $function$
  select 1000::bigint;
$function$;
