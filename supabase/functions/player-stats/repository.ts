export interface CacheRow {
  payload: unknown;
  updated_at: string | null;
  expires_at: string | null;
  next_attempt_at: string;
  lease_until: string | null;
  error_code: string | null;
}
export interface ProfileBinding {
  ingamename: string | null;
  mc_uuid: string | null;
}
export interface StatsRepository {
  profile(id: string): Promise<ProfileBinding | null>;
  read(key: string): Promise<CacheRow | null>;
  claim(
    key: string,
    provider: string,
    token: string
  ): Promise<{ claimed: boolean; reason?: string }>;
  finish(
    key: string,
    token: string,
    payload: unknown,
    ttl: number,
    error: string | null,
    retryAfter: number
  ): Promise<void>;
}

export function createRepository(
  env: Record<string, string | undefined>,
  fetcher = fetch
): StatsRepository {
  const base = env.SUPABASE_URL;
  const secret = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !secret) throw new Error('Missing server database configuration');
  async function request(path: string, body?: unknown) {
    const response = await fetcher(`${base}/rest/v1/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        apikey: secret!,
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) throw new Error(`Stats database request failed (${response.status})`);
    return response.status === 204 ? null : response.json();
  }
  return {
    profile: async (id) => {
      const rows = await request(
        `users?select=ingamename,mc_uuid&id=eq.${encodeURIComponent(id)}&limit=1`
      );
      return rows[0] ?? null;
    },
    read: (key) => request('rpc/player_stats_cache_read', { p_key: key }),
    claim: (key, provider, token) =>
      request('rpc/player_stats_claim_refresh', {
        p_key: key,
        p_provider: provider,
        p_token: token,
      }),
    finish: async (key, token, payload, ttl, error, retryAfter) => {
      await request('rpc/player_stats_finish_refresh', {
        p_key: key,
        p_token: token,
        p_payload: payload,
        p_ttl: ttl,
        p_error: error,
        p_retry_after: retryAfter,
      });
    },
  };
}
