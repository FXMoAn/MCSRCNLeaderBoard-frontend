-- Link previews/reopens do not consume setup. Only a browser-bound callback does.
-- Existing business tables, grants and policies are untouched.
alter table tencent_docs_private.oauth_states
  add column setup_hash text check (setup_hash ~ '^[0-9a-f]{64}$');

create or replace function public.tencent_docs_oauth_storage(p_action text, p_payload jsonb)
returns jsonb
language plpgsql security invoker set search_path = ''
as $function$
declare
  v_setup_hash text;
  v_setup_expires_at timestamptz;
begin
  if p_action = 'begin' then
    select expires_at into v_setup_expires_at
      from tencent_docs_private.oauth_setups
      where token_hash = p_payload->>'setup_hash' and used_at is null and expires_at > now();
    if not found then return jsonb_build_object('valid', false); end if;
    -- Both cleanup and claim lock state before setup.
    delete from tencent_docs_private.oauth_states where expires_at < now();
    delete from tencent_docs_private.oauth_setups where expires_at < now();
    insert into tencent_docs_private.oauth_states (state_hash, browser_hash, expires_at, setup_hash)
      values (p_payload->>'state_hash', p_payload->>'browser_hash',
        least(now() + interval '10 minutes', v_setup_expires_at), p_payload->>'setup_hash');
    return jsonb_build_object('valid', true);
  elsif p_action = 'claim' then
    select setup_hash into v_setup_hash
      from tencent_docs_private.oauth_states
      where state_hash = p_payload->>'state_hash' and browser_hash = p_payload->>'browser_hash'
        and used_at is null and expires_at > now()
      for update;
    if not found or v_setup_hash is null then return jsonb_build_object('valid', false); end if;
    -- The setup association comes from the locked state, never the callback.
    update tencent_docs_private.oauth_setups set used_at = now()
      where token_hash = v_setup_hash and used_at is null and expires_at > now();
    if not found then return jsonb_build_object('valid', false); end if;
    update tencent_docs_private.oauth_states set used_at = now()
      where state_hash = p_payload->>'state_hash';
    return jsonb_build_object('valid', true);
  elsif p_action = 'save' then
    insert into tencent_docs_private.connections
      (client_id, open_id, encrypted_credentials, access_expires_at, scopes)
      values (
        p_payload->>'client_id', p_payload->>'open_id', p_payload->'encrypted_credentials',
        (p_payload->>'access_expires_at')::timestamptz,
        array(select jsonb_array_elements_text(p_payload->'scopes'))
      )
      on conflict (client_id) do update set
        open_id = excluded.open_id, encrypted_credentials = excluded.encrypted_credentials,
        access_expires_at = excluded.access_expires_at, scopes = excluded.scopes, updated_at = now();
    return jsonb_build_object('saved', true);
  end if;
  raise exception 'Unsupported OAuth storage operation' using errcode = '22023';
end;
$function$;
revoke all on function public.tencent_docs_oauth_storage(text, jsonb) from public, anon, authenticated;
grant execute on function public.tencent_docs_oauth_storage(text, jsonb) to service_role;
