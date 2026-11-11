-- Reserve both possible Ranked primary/alternate requests before starting a refresh.
create or replace function public.player_stats_claim_refresh(p_key text, p_provider text, p_token uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  cached mcsrcn_player_stats.cache%rowtype;
  budget mcsrcn_player_stats.refresh_budget%rowtype;
  v_now timestamptz := clock_timestamp();
  window_seconds integer;
  request_limit integer;
  request_cost integer;
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
  request_cost := case p_provider when 'ranked' then 2 else 1 end;
  window_start := to_timestamp(floor(extract(epoch from v_now) / window_seconds) * window_seconds);
  select * into budget from mcsrcn_player_stats.refresh_budget where provider = p_provider for update;
  if budget.window_started_at <> window_start then
    budget.window_started_at := window_start;
    budget.used := 0;
  end if;
  if budget.blocked_until > v_now or budget.used + request_cost > request_limit then
    retry_time := greatest(budget.blocked_until, case when budget.used + request_cost > request_limit
      then window_start + make_interval(secs => window_seconds) else v_now end);
    update mcsrcn_player_stats.cache set next_attempt_at = retry_time, error_code = 'rate_limited' where cache_key = p_key;
    return jsonb_build_object('claimed', false, 'reason', 'rate_limited');
  end if;
  update mcsrcn_player_stats.refresh_budget set window_started_at = window_start, used = budget.used + request_cost where provider = p_provider;
  update mcsrcn_player_stats.cache set lease_token = p_token, lease_until = v_now + interval '20 seconds' where cache_key = p_key;
  return jsonb_build_object('claimed', true);
end;
$$;

