-- One-use capabilities authorize only a read-only inspection of a fixed document.
create table tencent_docs_private.inspection_tokens (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz
);
alter table tencent_docs_private.inspection_tokens enable row level security;
revoke all on tencent_docs_private.inspection_tokens from public, anon, authenticated;
grant select, insert, update, delete on tencent_docs_private.inspection_tokens to service_role;

create function public.consume_tencent_docs_inspection_token(p_token_hash text)
returns boolean
language plpgsql security invoker set search_path = ''
as $function$
begin
  update tencent_docs_private.inspection_tokens set used_at = now()
    where token_hash = p_token_hash and used_at is null and expires_at > now();
  return found;
end;
$function$;
revoke all on function public.consume_tencent_docs_inspection_token(text) from public, anon, authenticated;
grant execute on function public.consume_tencent_docs_inspection_token(text) to service_role;

