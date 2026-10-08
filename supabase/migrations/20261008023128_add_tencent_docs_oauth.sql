-- Applied as 20261008023128. No changes to public.users, public.runs or their policies.
create schema if not exists tencent_docs_private;
revoke all on schema tencent_docs_private from public, anon, authenticated;
grant usage on schema tencent_docs_private to service_role;

create table tencent_docs_private.oauth_setups (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz
);
create table tencent_docs_private.oauth_states (
  state_hash text primary key check (state_hash ~ '^[0-9a-f]{64}$'),
  browser_hash text not null check (browser_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz
);
create table tencent_docs_private.connections (
  client_id text primary key,
  open_id text not null,
  encrypted_credentials jsonb not null
    check (encrypted_credentials->>'version' = '1'
      and encrypted_credentials->>'algorithm' = 'AES-GCM'
      and encrypted_credentials ? 'iv' and encrypted_credentials ? 'data'),
  access_expires_at timestamptz not null,
  scopes text[] not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table tencent_docs_private.oauth_setups enable row level security;
alter table tencent_docs_private.oauth_states enable row level security;
alter table tencent_docs_private.connections enable row level security;
revoke all on all tables in schema tencent_docs_private from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema tencent_docs_private to service_role;

-- PostgREST exposes only this RPC; its caller must already be service_role.
create function public.tencent_docs_oauth_storage(p_action text, p_payload jsonb)
returns jsonb
language plpgsql security invoker set search_path = ''
as $function$
begin
  if p_action = 'begin' then
    update tencent_docs_private.oauth_setups
      set used_at = now()
      where token_hash = p_payload->>'setup_hash' and used_at is null and expires_at > now();
    if not found then return jsonb_build_object('valid', false); end if;
    insert into tencent_docs_private.oauth_states (state_hash, browser_hash, expires_at)
      values (p_payload->>'state_hash', p_payload->>'browser_hash', now() + interval '10 minutes');
    delete from tencent_docs_private.oauth_setups where expires_at < now();
    delete from tencent_docs_private.oauth_states where expires_at < now();
    return jsonb_build_object('valid', true);
  elsif p_action = 'claim' then
    update tencent_docs_private.oauth_states
      set used_at = now()
      where state_hash = p_payload->>'state_hash' and browser_hash = p_payload->>'browser_hash'
        and used_at is null and expires_at > now();
    return jsonb_build_object('valid', found);
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
