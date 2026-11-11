-- Public HTTP reads are served by the function. Cache rows and refresh control
-- are internal; neither anon nor authenticated clients can call these RPCs.
create schema mcsrcn_player_stats;
revoke all on schema mcsrcn_player_stats from public, anon, authenticated;
grant usage on schema mcsrcn_player_stats to service_role;

create table mcsrcn_player_stats.cache (
  cache_key text primary key,
  provider text not null check (provider in ('paceman', 'ranked')),
  payload jsonb,
  updated_at timestamptz,
  expires_at timestamptz,
  next_attempt_at timestamptz not null default now(),
  lease_token uuid,
  lease_until timestamptz,
  error_code text check (error_code in ('not_found', 'timeout', 'rate_limited', 'upstream', 'invalid_response')),
  check ((payload is null) = (updated_at is null)),
  check ((payload is null) = (expires_at is null))
);
create table mcsrcn_player_stats.refresh_budget (
  provider text primary key check (provider in ('paceman', 'ranked')),
  window_started_at timestamptz not null,
  used integer not null default 0 check (used >= 0),
  blocked_until timestamptz not null default '-infinity'
);
insert into mcsrcn_player_stats.refresh_budget(provider, window_started_at)
values ('paceman', now()), ('ranked', now());

alter table mcsrcn_player_stats.cache enable row level security;
alter table mcsrcn_player_stats.refresh_budget enable row level security;
revoke all on all tables in schema mcsrcn_player_stats from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema mcsrcn_player_stats to service_role;
create policy service_cache on mcsrcn_player_stats.cache for all to service_role using (true) with check (true);
create policy service_budget on mcsrcn_player_stats.refresh_budget for all to service_role using (true) with check (true);

create function public.player_stats_cache_read(p_key text) returns jsonb
language sql stable security invoker set search_path = '' as $$
  select to_jsonb(c) - 'lease_token' from mcsrcn_player_stats.cache c where c.cache_key = p_key;
$$;

create function public.player_stats_claim_refresh(p_key text, p_provider text, p_token uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  cached mcsrcn_player_stats.cache%rowtype;
  budget mcsrcn_player_stats.refresh_budget%rowtype;
  v_now timestamptz := clock_timestamp();
  window_seconds integer;
  request_limit integer;
  window_start timestamptz;
  retry_time timestamptz;
begin
  if p_provider not in ('paceman', 'ranked') or length(p_key) > 120 or p_token is null then
    raise exception 'Invalid refresh request';
  end if;
  insert into mcsrcn_player_stats.cache(cache_key, provider)
    values (p_key, p_provider) on conflict do nothing;
  select * into cached from mcsrcn_player_stats.cache where cache_key = p_key for update;
  if cached.provider <> p_provider then raise exception 'Invalid provider'; end if;
  if cached.expires_at > v_now then return jsonb_build_object('claimed', false, 'reason', 'fresh'); end if;
  if cached.next_attempt_at > v_now then return jsonb_build_object('claimed', false, 'reason', 'cooldown'); end if;
  if cached.lease_until > v_now then return jsonb_build_object('claimed', false, 'reason', 'busy'); end if;

  -- Atomic budget shared across instances. Leave headroom below upstream limits.
  window_seconds := case p_provider when 'paceman' then 60 else 600 end;
  request_limit := case p_provider when 'paceman' then 120 else 360 end;
  window_start := to_timestamp(floor(extract(epoch from v_now) / window_seconds) * window_seconds);
  select * into budget from mcsrcn_player_stats.refresh_budget where provider = p_provider for update;
  if budget.window_started_at <> window_start then
    budget.window_started_at := window_start;
    budget.used := 0;
  end if;
  if budget.blocked_until > v_now or budget.used >= request_limit then
    retry_time := greatest(budget.blocked_until, case when budget.used >= request_limit
      then window_start + make_interval(secs => window_seconds) else v_now end);
    update mcsrcn_player_stats.cache set next_attempt_at = retry_time, error_code = 'rate_limited' where cache_key = p_key;
    return jsonb_build_object('claimed', false, 'reason', 'rate_limited');
  end if;
  update mcsrcn_player_stats.refresh_budget set window_started_at = window_start, used = budget.used + 1 where provider = p_provider;
  update mcsrcn_player_stats.cache set lease_token = p_token, lease_until = v_now + interval '20 seconds' where cache_key = p_key;
  return jsonb_build_object('claimed', true);
end;
$$;

create function public.player_stats_finish_refresh(
  p_key text, p_token uuid, p_payload jsonb, p_ttl integer, p_error text, p_retry_after integer
) returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_now timestamptz := clock_timestamp();
  retry_time timestamptz := v_now + make_interval(secs => greatest(5, least(p_retry_after, 604800)));
  target_provider text;
begin
  -- Expired/replaced leases cannot overwrite newer results.
  if p_payload is not null and p_error is null then
    update mcsrcn_player_stats.cache set
      payload = p_payload, updated_at = v_now,
      expires_at = v_now + make_interval(secs => greatest(30, least(p_ttl, 600))),
      next_attempt_at = v_now + make_interval(secs => greatest(30, least(p_ttl, 600))),
      error_code = null, lease_token = null, lease_until = null
    where cache_key = p_key and lease_token = p_token and lease_until > v_now;
  else
    update mcsrcn_player_stats.cache set next_attempt_at = retry_time,
      error_code = coalesce(p_error, 'invalid_response'), lease_token = null, lease_until = null
    where cache_key = p_key and lease_token = p_token and lease_until > v_now
    returning provider into target_provider;
    if target_provider is not null and p_error = 'rate_limited' then
      update mcsrcn_player_stats.refresh_budget set blocked_until = greatest(blocked_until, retry_time)
      where provider = target_provider;
    end if;
  end if;
end;
$$;

revoke all on function public.player_stats_cache_read(text) from public, anon, authenticated;
revoke all on function public.player_stats_claim_refresh(text, text, uuid) from public, anon, authenticated;
revoke all on function public.player_stats_finish_refresh(text, uuid, jsonb, integer, text, integer) from public, anon, authenticated;
grant execute on function public.player_stats_cache_read(text) to service_role;
grant execute on function public.player_stats_claim_refresh(text, text, uuid) to service_role;
grant execute on function public.player_stats_finish_refresh(text, uuid, jsonb, integer, text, integer) to service_role;
