import {
  MAX_STALE_MS,
  PACEMAN_RANGES,
  RANKED_TTL,
  emptyResult,
  normalizeStats,
  type PacemanRange,
  type StatsError,
  type StatsProvider,
  type StatsResult,
} from '../../../shared/player-stats.ts';
import type { CacheRow, StatsRepository } from './repository.ts';

interface Options {
  repository: StatsRepository;
  fetcher?: typeof fetch;
  now?: () => number;
  defer: (task: Promise<unknown>) => void;
  sleep?: (ms: number) => Promise<void>;
  log?: (event: Record<string, unknown>) => void;
}
type PublicResult = StatsResult<unknown>;
const ERROR_CODES: StatsError[] = ['timeout', 'rate_limited', 'upstream', 'invalid_response'];

function retrySeconds(value: string | null, now: number): number {
  if (!value) return 60;
  const numeric = Number(value);
  const seconds = Number.isFinite(numeric) ? numeric : Math.ceil((Date.parse(value) - now) / 1000);
  return Number.isFinite(seconds) ? Math.max(1, Math.min(604800, Math.ceil(seconds))) : 60;
}

export function createHandler(options: Options) {
  const repo = options.repository;
  const fetcher = options.fetcher ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  const log = options.log ?? ((event) => console.log(JSON.stringify(event)));

  function fromCache(provider: StatsProvider, row: CacheRow | null): PublicResult | null {
    if (!row) return null;
    const updated = Date.parse(row.updated_at ?? '');
    const expires = Date.parse(row.expires_at ?? '');
    const data = normalizeStats(provider, row.payload);
    const retryAfter = Math.max(1, Math.ceil((Date.parse(row.next_attempt_at) - now()) / 1000));
    if (
      data &&
      Number.isFinite(updated) &&
      Number.isFinite(expires) &&
      now() - updated < MAX_STALE_MS
    ) {
      const error = ERROR_CODES.find((code) => code === row.error_code);
      return {
        status: 'ok',
        data,
        updatedAt: row.updated_at,
        expiresAt: row.expires_at,
        stale: expires <= now(),
        ...(error ? { error, retryAfter } : {}),
      };
    }
    if (row.error_code === 'not_found') return { ...emptyResult('not_found'), retryAfter };
    return null;
  }

  function respond(result: PublicResult, status = 200, cache = false) {
    const ttl = result.stale
      ? 5
      : result.expiresAt
        ? Math.max(1, Math.min(60, Math.floor((Date.parse(result.expiresAt) - now()) / 1000)))
        : 30;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': cache ? 'public, max-age=0, must-revalidate' : 'no-store',
      'Vercel-CDN-Cache-Control': cache
        ? `public, max-age=${ttl}, stale-while-revalidate=30`
        : 'no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    if (result.retryAfter && status >= 400) headers['Retry-After'] = String(result.retryAfter);
    return new Response(JSON.stringify(result), { status, headers });
  }

  async function refresh(
    provider: StatsProvider,
    key: string,
    token: string,
    name: string,
    identifier: string,
    range: PacemanRange
  ) {
    const started = now();
    let payload: unknown = null;
    let error: string | null = null;
    let retryAfter = 30;
    let status = 0;
    const attempts: number[] = [];
    const candidates =
      provider === 'ranked'
        ? [
            `https://api.mcsrranked.com/users/${encodeURIComponent(identifier)}`,
            `https://mcsrranked.com/api/users/${encodeURIComponent(identifier)}`,
          ]
        : ['https://paceman.gg/stats/api/getSessionStats/'];
    for (const [index, candidate] of candidates.entries()) {
      error = null;
      try {
        const url = new URL(candidate);
        if (provider === 'paceman') {
          url.search = new URLSearchParams({
            name,
            hours: String(PACEMAN_RANGES[range].hours),
            hoursBetween: String(PACEMAN_RANGES[range].hoursBetween),
          }).toString();
        }
        const response = await fetcher(url, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(provider === 'ranked' ? 4000 : 8000),
        });
        status = response.status;
        attempts.push(status);
        if (status >= 500 && index < candidates.length - 1) {
          await response.body?.cancel();
          continue;
        }
        if (status === 429) {
          error = 'rate_limited';
          retryAfter = retrySeconds(response.headers.get('Retry-After'), now());
        } else {
          const body = await response.json();
          if (
            status === 404 ||
            (provider === 'ranked' && status === 400 && /not found/i.test(String(body?.data)))
          ) {
            error = 'not_found';
            retryAfter = 60;
          } else if (!response.ok) {
            error = 'upstream';
          } else {
            payload = normalizeStats(
              provider,
              provider === 'ranked' && body?.status === 'success'
                ? body.data
                : provider === 'paceman'
                  ? body
                  : null
            );
            if (!payload) error = 'invalid_response';
          }
        }
        break;
      } catch (cause) {
        error =
          cause instanceof Error && ['TimeoutError', 'AbortError'].includes(cause.name)
            ? 'timeout'
            : 'upstream';
        attempts.push(0);
        if (index < candidates.length - 1) continue;
      }
    }
    await repo.finish(
      key,
      token,
      payload,
      provider === 'ranked' ? RANKED_TTL : PACEMAN_RANGES[range].ttl,
      error,
      retryAfter
    );
    log({
      event: 'player_stats_refresh',
      provider,
      upstreamStatus: status,
      attempts,
      elapsedMs: now() - started,
      outcome: error ?? 'ok',
    });
    return repo.read(key);
  }

  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS')
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
        },
      });
    if (request.method !== 'GET') return respond(emptyResult('unavailable'), 405);
    const url = new URL(request.url);
    const match = url.pathname.match(/\/player-stats\/([1-9]\d{0,9})\/(paceman|ranked)\/?$/);
    if (!match) return respond(emptyResult('not_found'), 404);
    const [, id, rawProvider] = match;
    const provider = rawProvider as StatsProvider;
    const range = (url.searchParams.get('range') ?? 'session') as PacemanRange;
    if (
      [...url.searchParams.keys()].some((key) => key !== 'range' || provider !== 'paceman') ||
      url.searchParams.getAll('range').length > 1 ||
      !Object.hasOwn(PACEMAN_RANGES, range)
    ) {
      return respond(emptyResult('unavailable'), 400);
    }
    try {
      const profile = await repo.profile(id);
      if (!profile) return respond(emptyResult('not_found'), 404);
      const name = profile.ingamename?.trim() ?? '';
      const uuid = profile.mc_uuid?.replaceAll('-', '').toLowerCase() ?? '';
      const validUuid = /^[a-f0-9]{32}$/.test(uuid);
      const validName = /^[a-zA-Z0-9_]{1,16}$/.test(name);
      if (provider === 'paceman' ? !validName : !validUuid && !validName)
        return respond(emptyResult('unbound'), 200, true);
      const identifier = validUuid ? uuid : name.toLowerCase();
      const key = `${provider}:${identifier}${provider === 'paceman' ? `:${range}` : ''}`;
      let row = await repo.read(key);
      const previous = fromCache(provider, row);
      if (previous?.status === 'ok' && !previous.stale) return respond(previous, 200, true);
      if (row && Date.parse(row.next_attempt_at) > now()) {
        return respond(
          previous ?? {
            ...emptyResult(
              'unavailable',
              ERROR_CODES.find((code) => code === row?.error_code) ?? 'upstream'
            ),
            retryAfter: Math.max(1, Math.ceil((Date.parse(row.next_attempt_at) - now()) / 1000)),
          },
          previous ? 200 : 503,
          !!previous
        );
      }
      const token = crypto.randomUUID();
      const claim = await repo.claim(key, provider, token);
      if (claim.claimed) {
        const work = refresh(provider, key, token, name, identifier, range);
        if (previous?.data) {
          options.defer(
            work.catch(() => log({ event: 'player_stats_background_error', provider }))
          );
          return respond(previous, 200, true);
        }
        row = await work;
      } else {
        // A different instance owns the refresh. Wait briefly for its cold result;
        // never start a second upstream request for the same player/range.
        const delays = claim.reason === 'busy' ? [150, 350, 750, 1500, 3000, 2000] : [0];
        if (previous?.data) return respond(previous, 200, true);
        for (const delay of delays) {
          if (delay) await sleep(delay);
          row = await repo.read(key);
          if (
            fromCache(provider, row) ||
            (row?.error_code && Date.parse(row.next_attempt_at) > now())
          )
            break;
        }
      }
      const result = fromCache(provider, row);
      if (result) return respond(result, 200, true);
      return respond(
        {
          ...emptyResult(
            'unavailable',
            ERROR_CODES.find((code) => code === row?.error_code) ?? 'upstream'
          ),
          retryAfter: Math.max(
            2,
            Math.ceil((Date.parse(row?.next_attempt_at ?? '') - now()) / 1000) || 2
          ),
        },
        503
      );
    } catch {
      log({ event: 'player_stats_request_error', provider });
      return respond(emptyResult('unavailable', 'upstream'), 503);
    }
  };
}
