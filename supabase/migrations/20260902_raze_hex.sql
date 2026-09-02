-- Applied to the vavaworld project on 2026-09-02 (Supabase migration
-- "raze_hex_rpc"). Kept here so the function is reproducible.
--
-- The web server talks to Supabase with the anon key, so every mutation
-- goes through a SECURITY DEFINER function guarded by the API secret.
-- /api/raze calls this after confirming on-chain that the hex is unowned.

create or replace function public.raze_hex(p_h3 text, p_owner text, p_secret text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_hex hexes%rowtype;
begin
  perform require_api_secret(p_secret);
  select * into v_hex from hexes where h3_id = p_h3 for update;
  if not found then
    return json_build_object('h3', p_h3, 'removed', false, 'note', 'not in registry');
  end if;
  -- EVM addresses arrive checksummed or lowercase depending on the source.
  if lower(v_hex.owner) <> lower(p_owner) then
    raise exception 'registry owner is not the caller';
  end if;
  update listings set status = 'cancelled', closed_at = now()
    where h3_id = p_h3 and status = 'active';
  update bids set status = 'cancelled', closed_at = now()
    where h3_id = p_h3 and status = 'active';
  delete from hexes where h3_id = p_h3;
  return json_build_object('h3', p_h3, 'removed', true);
end;
$function$;
