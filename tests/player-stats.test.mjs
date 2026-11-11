import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerStatsClient } from '../src/services/playerStats.ts';
import { createHandler } from '../supabase/functions/player-stats/handler.ts';
import {
  MAX_STALE_MS,
  PACE_SPLITS,
  normalizePaceman,
  normalizeRanked,
} from '../shared/player-stats.ts';

const NOW = Date.parse('2026-11-11T08:00:00Z');
const uuid = '123456781234123412341234567890ab';
const pace = () => Object.fromEntries(PACE_SPLITS.map((key) => [key, { count: 4, avg: '01:23' }]));
const period = () =>
  Object.fromEntries(
    ['bestTime', 'playedMatches', 'completionTime', 'forfeits', 'completions', 'wins', 'loses'].map(
      (key) => [key, { ranked: 4 }]
    )
  );
const ranked = () => ({
  eloRate: 1800,
  eloRank: 200,
  statistics: { season: period(), total: period() },
});
const result = (data = ranked(), age = 0, ttl = 180_000) => ({
  status: 'ok',
  data,
  updatedAt: new Date(NOW - age).toISOString(),
  expiresAt: new Date(NOW - age + ttl).toISOString(),
  stale: age >= ttl,
});
const query = { profileId: 6, ingamename: 'LEC666888', provider: 'ranked' };
const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers });

function fakeRepository(initial = null) {
  let row = initial;
  let activeToken;
  let claims = 0;
  const repo = {
    profile: async () => ({ ingamename: 'LEC666888', mc_uuid: uuid }),
    read: async () => row,
    claim: async (_key, _provider, token) => {
      if (activeToken) return { claimed: false, reason: 'busy' };
      activeToken = token;
      claims++;
      return { claimed: true };
    },
    finish: async (_key, token, data, ttl, error, retryAfter) => {
      assert.equal(token, activeToken);
      row =
        data && !error
          ? {
              payload: data,
              updated_at: new Date(NOW).toISOString(),
              expires_at: new Date(NOW + ttl * 1000).toISOString(),
              next_attempt_at: new Date(NOW + ttl * 1000).toISOString(),
              error_code: null,
              lease_until: null,
            }
          : {
              ...row,
              payload: row?.payload ?? null,
              updated_at: row?.updated_at ?? null,
              expires_at: row?.expires_at ?? null,
              next_attempt_at: new Date(NOW + retryAfter * 1000).toISOString(),
              error_code: error,
              lease_until: null,
            };
      activeToken = undefined;
    },
  };
  return { repo, getRow: () => row, getClaims: () => claims };
}
function cacheRow(data, age = 0) {
  const sample = result(data, age);
  return {
    payload: data,
    updated_at: sample.updatedAt,
    expires_at: sample.expiresAt,
    next_attempt_at: sample.expiresAt,
    error_code: null,
    lease_until: null,
  };
}
function handlerFor(repository, fetcher, extra = {}) {
  const tasks = [];
  const handler = createHandler({
    repository,
    fetcher,
    now: () => NOW,
    log: () => {},
    defer: (task) => tasks.push(task),
    ...extra,
  });
  return { handler, tasks };
}
const request = (suffix = '6/ranked') =>
  new Request(`https://example.com/functions/v1/player-stats/${suffix}`);

test('Ranked cold responses are unwrapped once; browser cache returns the same player shape', async () => {
  let calls = 0;
  const client = createPlayerStatsClient({
    storage: null,
    now: () => NOW,
    fetcher: async (url, init) => {
      calls++;
      assert.equal(url, '/api/player-stats/6/ranked');
      assert.equal(init.credentials, 'omit');
      assert.equal(init.headers.Authorization, undefined);
      return json(result());
    },
  });
  const first = await client.load(query);
  const cached = await client.load(query);
  assert.equal(calls, 1);
  assert.deepEqual(first, cached);
  assert.equal(first.data.statistics.season.wins.ranked, 4);
});

test('Concurrent requests for the same player reuse one browser request', async () => {
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const client = createPlayerStatsClient({
    storage: null,
    now: () => NOW,
    fetcher: async () => {
      calls++;
      await gate;
      return json(result());
    },
  });
  const a = client.load(query);
  const b = client.load(query);
  release();
  await Promise.all([a, b]);
  assert.equal(calls, 1);
});

test('Network failure and malformed successful payload preserve last-good data', async () => {
  let clock = NOW;
  let mode = 'good';
  const client = createPlayerStatsClient({
    storage: null,
    now: () => clock,
    fetcher: async () => {
      if (mode === 'error') throw new TypeError('offline');
      return json(mode === 'bad' ? result({ statistics: {} }) : result());
    },
  });
  await client.load(query);
  clock += 200_000;
  for (mode of ['error', 'bad']) {
    clock += 6000;
    const fallback = await client.load(query);
    assert.equal(fallback.data.eloRate, 1800);
    assert.equal(fallback.stale, true);
    assert.equal(fallback.updatedAt, new Date(NOW).toISOString());
  }
});

test('CDN responses do not restart freshness; data older than 24h is not shown', async () => {
  let clock = NOW;
  let calls = 0;
  const client = createPlayerStatsClient({
    storage: null,
    now: () => clock,
    fetcher: async () => {
      calls++;
      if (calls > 1) throw new TypeError('offline');
      return json(result(ranked(), 200_000));
    },
  });
  assert.equal((await client.load(query)).stale, true);
  await client.load(query);
  assert.equal(calls, 2);
  clock += MAX_STALE_MS;
  assert.equal((await client.load(query)).data, null);
});

test('Binding and Paceman ranges have separate browser cache entries', async () => {
  let calls = 0;
  const client = createPlayerStatsClient({
    storage: null,
    now: () => NOW,
    fetcher: async () => {
      calls++;
      return json(result(pace()));
    },
  });
  await client.load({ ...query, provider: 'paceman', range: 'day' });
  await client.load({ ...query, provider: 'paceman', range: 'week' });
  await client.load({ ...query, provider: 'paceman', range: 'day', ingamename: 'AnotherPlayer' });
  assert.equal(calls, 3);
});

test('Cold backend unwraps Ranked envelope, uses UUID and sets public CDN headers', async () => {
  const fake = fakeRepository();
  const { handler } = handlerFor(fake.repo, async (url) => {
    assert.equal(String(url), `https://api.mcsrranked.com/users/${uuid}`);
    return json({ status: 'success', data: { ...ranked(), privateField: 'excluded' } });
  });
  const response = await handler(request());
  const body = await response.json();
  assert.equal(body.data.eloRate, 1800);
  assert.equal(body.data.privateField, undefined);
  assert.equal(response.headers.get('Cache-Control'), 'public, max-age=0, must-revalidate');
  assert.match(response.headers.get('Vercel-CDN-Cache-Control'), /max-age=60/);
  assert.equal(fake.getClaims(), 1);
});

test('Fresh shared cache serves without upstream access', async () => {
  const fake = fakeRepository(cacheRow(ranked()));
  const { handler } = handlerFor(fake.repo, async () => {
    assert.fail('must not call upstream');
  });
  assert.equal((await (await handler(request())).json()).data.eloRate, 1800);
  assert.equal(fake.getClaims(), 0);
});

test('Ranked 5xx uses its official alternate once; 429 never triggers failover', async () => {
  const fake = fakeRepository();
  const urls = [];
  const { handler } = handlerFor(fake.repo, async (url) => {
    urls.push(String(url));
    return urls.length === 1 ? json({}, 502) : json({ status: 'success', data: ranked() });
  });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).data.eloRate, 1800);
  assert.equal(urls.length, 2);
  assert.match(urls[1], /^https:\/\/mcsrranked\.com\/api\/users\//);
});

test('Stale shared cache returns before background refresh and survives upstream failure', async () => {
  const fake = fakeRepository(cacheRow(ranked(), 300_000));
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const { handler, tasks } = handlerFor(fake.repo, async () => {
    await gate;
    return json({ error: 'unavailable' }, 503);
  });
  const response = await handler(request());
  assert.equal((await response.json()).stale, true);
  assert.equal(tasks.length, 1);
  release();
  await Promise.all(tasks);
  assert.equal(fake.getRow().payload.eloRate, 1800);
  assert.equal(fake.getRow().updated_at, new Date(NOW - 300_000).toISOString());
  assert.equal(fake.getRow().error_code, 'upstream');
});

test('429 honors Retry-After and a cooldown request does not call upstream', async () => {
  const fake = fakeRepository();
  let calls = 0;
  const { handler } = handlerFor(fake.repo, async () => {
    calls++;
    return json({}, 429, { 'Retry-After': '120' });
  });
  const first = await handler(request());
  assert.equal(first.status, 503);
  assert.equal(first.headers.get('Retry-After'), '120');
  assert.equal(first.headers.get('Vercel-CDN-Cache-Control'), 'no-store');
  assert.equal((await first.json()).error, 'rate_limited');
  await handler(request());
  assert.equal(calls, 1);
});

test('Malformed upstream data is never saved as successful data', async () => {
  const fake = fakeRepository();
  const { handler } = handlerFor(fake.repo, async () => json({ status: 'success', data: {} }));
  const response = await handler(request());
  assert.equal(response.status, 503);
  assert.equal(fake.getRow().payload, null);
  assert.equal(fake.getRow().error_code, 'invalid_response');
});

test('Paceman week request uses the documented name and exact range', async () => {
  const fake = fakeRepository();
  const { handler } = handlerFor(fake.repo, async (url) => {
    assert.equal(url.origin, 'https://paceman.gg');
    assert.equal(url.pathname, '/stats/api/getSessionStats/');
    assert.equal(url.searchParams.get('name'), 'LEC666888');
    assert.equal(url.searchParams.get('hours'), '168');
    assert.equal(url.searchParams.get('hoursBetween'), '168');
    return json(pace());
  });
  assert.equal((await handler(request('6/paceman?range=week'))).status, 200);
  assert.equal(Date.parse(fake.getRow().expires_at) - NOW, 300_000);
});

test('Only existing site profiles and fixed provider/range combinations can call upstream', async () => {
  const fake = fakeRepository();
  const { handler } = handlerFor(fake.repo, async () => {
    assert.fail('must not call upstream');
  });
  for (const suffix of [
    '6/arbitrary',
    '6/paceman?range=forever',
    '6/ranked?url=https://example.com',
    '6/paceman?range=day&range=week',
  ]) {
    assert.ok((await handler(request(suffix))).status >= 400);
  }
  fake.repo.profile = async () => null;
  assert.equal((await handler(request())).status, 404);
  fake.repo.profile = async () => ({ ingamename: null, mc_uuid: null });
  assert.equal((await (await handler(request())).json()).status, 'unbound');
  assert.equal(fake.getClaims(), 0);
});

test('Normalizers reject incomplete data and handle unranked players and empty splits', () => {
  assert.equal(normalizeRanked({ status: 'success', data: ranked() }), null);
  assert.equal(normalizeRanked({ ...ranked(), eloRate: null, eloRank: null }).eloRate, null);
  assert.equal(
    normalizePaceman({ ...pace(), nether: { count: 0, avg: null } }).nether.avg,
    '--:--'
  );
  assert.equal(normalizePaceman({ ...pace(), finish: undefined }), null);
});

test('Browser retries obey the server cooldown', async () => {
  let calls = 0;
  let clock = NOW;
  const client = createPlayerStatsClient({
    storage: null,
    now: () => clock,
    fetcher: async () => {
      calls++;
      return json(
        {
          status: 'unavailable',
          data: null,
          updatedAt: null,
          expiresAt: null,
          stale: false,
          error: 'rate_limited',
          retryAfter: 120,
        },
        503
      );
    },
  });
  await client.load(query);
  await client.load(query, true);
  assert.equal(calls, 1);
  clock += 120_000;
  await client.load(query, true);
  assert.equal(calls, 2);
});

test('Cooldown cannot return data past the 24-hour retention boundary', async () => {
  let clock = NOW;
  let calls = 0;
  const client = createPlayerStatsClient({
    storage: null,
    now: () => clock,
    fetcher: async () => {
      calls++;
      return calls === 1
        ? json(result(ranked(), MAX_STALE_MS - 60_000))
        : json({ status: 'unavailable', data: null, error: 'rate_limited', retryAfter: 120 }, 503);
    },
  });
  await client.load(query);
  assert.ok((await client.load(query, true)).data);
  clock += 90_000;
  const expired = await client.load(query, true);
  assert.equal(expired.data, null);
  assert.equal(expired.status, 'unavailable');
  assert.equal(calls, 2);
});

test('Fallback is rechecked if old data expires while a request is in flight', async () => {
  let clock = NOW;
  let calls = 0;
  const client = createPlayerStatsClient({
    storage: null,
    now: () => clock,
    fetcher: async () => {
      calls++;
      if (calls === 1) return json(result(ranked(), MAX_STALE_MS - 1000));
      clock += 2000;
      throw new TypeError('offline');
    },
  });
  await client.load(query);
  assert.equal((await client.load(query, true)).data, null);
});

test('CDN proxy strips upstream cookies and never forwards visitor credentials', async () => {
  const { createStatsProxy } = await import('../api/player-stats.js');
  const headers = new Map();
  let body;
  const response = {
    setHeader: (key, value) => headers.set(key.toLowerCase(), value),
    end: (value) => {
      body = JSON.parse(value);
    },
  };
  const proxy = createStatsProxy(async (url, init) => {
    assert.equal(
      String(url),
      'https://wdkxjftlgidebtczszsq.supabase.co/functions/v1/player-stats/6/ranked'
    );
    assert.equal(init.headers.Cookie, undefined);
    assert.equal(init.headers.Authorization, undefined);
    return json(result(), 200, {
      'Set-Cookie': 'gateway-cookie=private',
      'Vercel-CDN-Cache-Control': 'public, max-age=60',
    });
  });
  await proxy(
    {
      method: 'GET',
      url: '/api/player-stats/6/ranked',
      headers: { cookie: 'session=private', authorization: 'private' },
      query: { profileId: '6', provider: 'ranked' },
    },
    response
  );
  assert.equal(response.statusCode, 200);
  assert.equal(body.data.eloRate, 1800);
  assert.equal(headers.has('set-cookie'), false);
  assert.equal(headers.get('vercel-cdn-cache-control'), 'public, max-age=60');
});

test('CDN proxy does not cache errors or accept arbitrary destinations', async () => {
  const { createStatsProxy } = await import('../api/player-stats.js');
  const headers = new Map();
  const response = {
    setHeader: (key, value) => headers.set(key.toLowerCase(), value),
    end: () => {},
  };
  let calls = 0;
  const proxy = createStatsProxy(async () => {
    calls++;
    return json({ ...result(), status: 'unavailable', data: null }, 503, {
      'Vercel-CDN-Cache-Control': 'public, max-age=60',
    });
  });
  await proxy({ method: 'GET', url: '/api/player-stats?profileId=6&provider=ranked' }, response);
  assert.equal(response.statusCode, 503);
  assert.equal(headers.get('vercel-cdn-cache-control'), 'no-store');
  await proxy(
    { method: 'GET', url: '/api/player-stats?profileId=6&provider=ranked&url=https://example.com' },
    response
  );
  assert.equal(response.statusCode, 400);
  assert.equal(calls, 1);
});
