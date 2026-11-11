const BASE = 'https://wdkxjftlgidebtczszsq.supabase.co/functions/v1/player-stats/';
const unavailable = {
  status: 'unavailable',
  data: null,
  updatedAt: null,
  expiresAt: null,
  stale: false,
  error: 'upstream',
};

// The upstream gateway can attach Set-Cookie even to public statistics. Forward
// only the public JSON and explicit cache headers so the CDN can store it.
export function createStatsProxy(fetcher = fetch) {
  return async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Vercel-CDN-Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      response.statusCode = 405;
      return response.end(JSON.stringify(unavailable));
    }
    const url = new URL(request.url ?? '/', 'https://www.mcspeedrun.cn');
    const route = url.pathname.match(/^\/api\/player-stats\/([1-9]\d{0,9})\/(paceman|ranked)\/?$/);
    const query = request.query ?? Object.fromEntries(url.searchParams);
    const id = route?.[1] ?? query.profileId;
    const provider = route?.[2] ?? query.provider;
    const range = query.range;
    const invalid =
      typeof id !== 'string' ||
      !/^[1-9]\d{0,9}$/.test(id) ||
      !['paceman', 'ranked'].includes(provider) ||
      Object.keys(query).some((key) => !['profileId', 'provider', 'range'].includes(key)) ||
      (range !== undefined && (typeof range !== 'string' || provider !== 'paceman')) ||
      url.searchParams.getAll('range').length > 1;
    if (invalid) {
      response.statusCode = 400;
      return response.end(JSON.stringify(unavailable));
    }
    const upstream = new URL(`${id}/${provider}`, BASE);
    if (range !== undefined) upstream.searchParams.set('range', range);
    try {
      const result = await fetcher(upstream, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(20_000),
      });
      const body = await result.json();
      if (!body || !['ok', 'unavailable', 'unbound', 'not_found'].includes(body.status))
        throw new Error('Invalid upstream JSON');
      response.statusCode = result.status;
      const cacheable = result.ok && body.status !== 'unavailable';
      if (cacheable) {
        response.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
        response.setHeader(
          'Vercel-CDN-Cache-Control',
          result.headers.get('Vercel-CDN-Cache-Control') ?? 'no-store'
        );
      }
      const retryAfter = result.headers.get('Retry-After');
      if (retryAfter && /^\d+$/.test(retryAfter)) response.setHeader('Retry-After', retryAfter);
      return response.end(JSON.stringify(body));
    } catch {
      response.statusCode = 503;
      return response.end(JSON.stringify(unavailable));
    }
  };
}

export default createStatsProxy();
