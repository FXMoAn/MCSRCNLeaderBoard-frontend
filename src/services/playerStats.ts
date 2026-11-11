import {
  MAX_STALE_MS,
  emptyResult,
  normalizeStats,
  type ProviderData,
  type StatsProvider,
  type StatsQuery,
  type StatsResult,
} from '../../shared/player-stats.ts';

interface ClientOptions {
  fetcher?: typeof fetch;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  now?: () => number;
  timeoutMs?: number;
}

const STORAGE_KEY = 'mcsr:player-stats:v1';
type AnyResult = StatsResult<ProviderData[StatsProvider]>;

export function createPlayerStatsClient(options: ClientOptions = {}) {
  const fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  const now = options.now ?? Date.now;
  const memory = new Map<string, AnyResult>();
  const pending = new Map<string, Promise<AnyResult>>();
  const cooldowns = new Map<string, { until: number; result: AnyResult }>();
  let storage = options.storage;
  if (storage === undefined) {
    try {
      storage = globalThis.localStorage;
    } catch {
      storage = null;
    }
  }
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || '[]');
    if (Array.isArray(saved)) {
      for (const entry of saved.slice(-40)) {
        if (Array.isArray(entry) && typeof entry[0] === 'string') memory.set(entry[0], entry[1]);
      }
    }
  } catch {
    /* Private browsing and damaged local storage must not block requests. */
  }

  const keyFor = (query: StatsQuery) =>
    `${query.provider}:${query.profileId}:${query.ingamename?.trim().toLowerCase() ?? ''}:${query.provider === 'paceman' ? (query.range ?? 'session') : ''}`;

  function parse<P extends StatsProvider>(
    provider: P,
    raw: unknown
  ): StatsResult<ProviderData[P]> | null {
    if (!raw || typeof raw !== 'object') return null;
    const value = raw as StatsResult<unknown>;
    if (!['ok', 'unavailable', 'not_found', 'unbound'].includes(value.status)) return null;
    if (value.status !== 'ok') {
      return {
        ...emptyResult<ProviderData[P]>(value.status, value.error),
        retryAfter: value.retryAfter,
      };
    }
    const data = normalizeStats(provider, value.data);
    const updated = Date.parse(value.updatedAt ?? '');
    const expires = Date.parse(value.expiresAt ?? '');
    if (
      !data ||
      !Number.isFinite(updated) ||
      !Number.isFinite(expires) ||
      expires < updated ||
      updated > now() + 60_000
    )
      return null;
    if (now() - updated >= MAX_STALE_MS) return null;
    return { ...value, data, stale: value.stale || expires <= now() };
  }

  function cached<P extends StatsProvider>(
    query: StatsQuery<P>
  ): StatsResult<ProviderData[P]> | null {
    const key = keyFor(query);
    const value = parse(query.provider, memory.get(key));
    if (!value?.data) {
      memory.delete(key);
      return null;
    }
    return value;
  }

  function remember(key: string, result: AnyResult) {
    memory.delete(key);
    if (result.data) memory.set(key, result);
    while (memory.size > 40) memory.delete(memory.keys().next().value!);
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify([...memory]));
    } catch {
      /* Memory cache remains usable. */
    }
  }

  async function load<P extends StatsProvider>(
    query: StatsQuery<P>,
    force = false
  ): Promise<StatsResult<ProviderData[P]>> {
    const key = keyFor(query);
    const previous = cached(query);
    const cooldown = cooldowns.get(key);
    if (cooldown && cooldown.until > now()) {
      return (
        parse(query.provider, cooldown.result) ?? {
          ...emptyResult<ProviderData[P]>('unavailable', cooldown.result.error ?? 'upstream'),
          retryAfter: Math.ceil((cooldown.until - now()) / 1000),
        }
      );
    }
    cooldowns.delete(key);
    if (previous && !previous.stale && !force) return previous;
    const existing = pending.get(key);
    if (existing) return existing as Promise<StatsResult<ProviderData[P]>>;

    const task = (async (): Promise<StatsResult<ProviderData[P]>> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 25_000);
      try {
        const url = `/api/player-stats/${encodeURIComponent(String(query.profileId))}/${query.provider}`;
        const params = query.provider === 'paceman' ? `?range=${query.range ?? 'session'}` : '';
        const response = await fetcher(url + params, {
          signal: controller.signal,
          credentials: 'omit',
          cache: force ? 'reload' : 'default',
          headers: { Accept: 'application/json' },
        });
        const result = parse(query.provider, await response.json());
        if (!result || (!response.ok && result.status !== 'unavailable'))
          throw new Error('Invalid stats response');
        const currentCache = cached(query);
        if (result.status === 'unavailable' && currentCache) {
          const fallback: StatsResult<ProviderData[P]> = {
            ...currentCache,
            stale: true,
            error: result.error ?? 'upstream',
            retryAfter: result.retryAfter,
          };
          cooldowns.set(key, {
            until: now() + Math.max(2, result.retryAfter ?? 5) * 1000,
            result: fallback,
          });
          return fallback;
        }
        if (
          result.status === 'unavailable' ||
          result.status === 'not_found' ||
          (result.stale && result.error && result.retryAfter)
        ) {
          cooldowns.set(key, { until: now() + Math.max(2, result.retryAfter ?? 5) * 1000, result });
        }
        if (result.status !== 'unavailable') remember(key, result);
        return result;
      } catch {
        const error = controller.signal.aborted ? 'timeout' : 'upstream';
        const currentCache = cached(query);
        const fallback: StatsResult<ProviderData[P]> = currentCache
          ? { ...currentCache, stale: true, error }
          : emptyResult('unavailable', error);
        cooldowns.set(key, { until: now() + 5000, result: fallback });
        return fallback;
      } finally {
        clearTimeout(timer);
      }
    })();
    pending.set(key, task);
    try {
      return await task;
    } finally {
      pending.delete(key);
    }
  }

  return { cached, load };
}

export const playerStatsClient = createPlayerStatsClient();
