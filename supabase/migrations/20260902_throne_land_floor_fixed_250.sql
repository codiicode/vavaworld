-- Applied 2026-09-02 (Supabase migration "throne_land_floor_fixed_250").
-- Presidency land requirement: a FLAT 250 hexes in the country. The old
-- 5%-of-claims scaling made hot countries' thrones impossible to
-- challenge; the real gate is the 1M $VAVA stake, and coups keep
-- thrones contestable.
create or replace function public.throne_land_floor(p_iso text)
returns bigint
language sql
stable
as $function$
  select 250::bigint;
$function$;
