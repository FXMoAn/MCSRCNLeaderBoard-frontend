import test from 'node:test';
import assert from 'node:assert/strict';
import {
  safeRedirect,
  emailError,
  passwordError,
  authErrorMessage,
  callbackUrl,
  readEmailContext,
  writeEmailContext,
  EMAIL_CONTEXT_KEY,
  readAuthCallback,
} from '../src/auth/flow.ts';
import { createProfileLoader } from '../src/auth/profile.ts';

test('return paths retain query and fragment but reject external and auth loops', () => {
  assert.equal(safeRedirect('/user-upload?type=SSG#video'), '/user-upload?type=SSG#video');
  for (const target of [
    'https://example.com',
    '//example.com',
    '/\\example.com',
    '/%2fexample.com',
    '/login?redirect=/rank',
    '/auth/callback',
    '/user/login',
    '/path\n',
  ])
    assert.equal(safeRedirect(target), '/rank', target);
});

test('existing short passwords can sign in while new passwords share the minimum', () => {
  assert.equal(passwordError('old'), '');
  assert.match(passwordError('short', true), /8/);
  assert.equal(passwordError('long-example', true), '');
  assert.equal(emailError('test+alias@example.com'), '');
  assert.notEqual(emailError('bad-address'), '');
});

test('callback URL carries only safe navigation and flow metadata', () => {
  const url = new URL(callbackUrl('https://www.mcspeedrun.cn', 'signup', '//example.com'));
  assert.equal(url.pathname, '/auth/callback');
  assert.equal(url.searchParams.get('redirect'), '/rank');
  assert.equal(url.searchParams.get('flow'), 'signup');
  assert.equal(
    readAuthCallback(
      'https://site.invalid/auth/callback#error=access_denied&error_code=otp_expired'
    ).error,
    '邮件链接已失效，请重新申请'
  );
  const parsed = readAuthCallback(
    'https://site.invalid/auth/callback#access_token=not-a-real-token&type=recovery'
  );
  assert.deepEqual(Object.keys(parsed).sort(), ['error', 'present', 'recovery']);
});

test('email context expires and survives malformed or unavailable storage', () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const now = 100_000;
  writeEmailContext(storage, {
    email: 'test@example.com',
    purpose: 'signup',
    redirect: '//example.com',
    retryAt: now + 60_000,
    expiresAt: now + 1_800_000,
  });
  assert.equal(readEmailContext(storage, now).redirect, '/rank');
  assert.equal(readEmailContext(storage, now + 1_800_001), null);
  storage.setItem(EMAIL_CONTEXT_KEY, '{invalid');
  assert.equal(readEmailContext(storage, now), null);
  assert.doesNotThrow(() =>
    writeEmailContext(
      {
        setItem: () => {
          throw Error();
        },
      },
      {}
    )
  );
});

test('profile loading waits for the real request and deduplicates callers', async () => {
  let finish;
  let calls = 0;
  let state;
  const loader = createProfileLoader(
    () => {
      calls++;
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
    (value) => {
      state = value;
    }
  );
  const first = loader.load('account-a');
  assert.equal(loader.load('account-a'), first);
  assert.equal(state.status, 'loading');
  finish({ id: 1 });
  await first;
  assert.equal(state.status, 'ready');
  await loader.load('account-a');
  assert.equal(calls, 1);
});

test('a missing profile is a normal onboarding state', async () => {
  const loader = createProfileLoader(
    async () => null,
    () => {}
  );
  assert.equal((await loader.load('new-account')).status, 'missing');
});

test('late profile responses cannot cross accounts or sign-out', async () => {
  const resolvers = {};
  let state;
  const loader = createProfileLoader(
    (owner) =>
      new Promise((resolve) => {
        resolvers[owner] = resolve;
      }),
    (value) => {
      state = value;
    }
  );
  const old = loader.load('account-a');
  const current = loader.load('account-b');
  resolvers['account-b']({ id: 2 });
  await current;
  resolvers['account-a']({ id: 1 });
  await old;
  assert.equal(state.profile.id, 2);
  const pending = loader.load('account-b', true);
  loader.setOwner(null);
  resolvers['account-b']({ id: 2 });
  await pending;
  assert.equal(state.owner, null);
  assert.equal(state.profile, null);
});

test('profile errors remain retryable without discarding authentication', async () => {
  let fails = true;
  let requests = 0;
  const loader = createProfileLoader(
    async () => {
      requests++;
      if (fails) throw new Error('offline');
      return { id: 1 };
    },
    () => {}
  );
  assert.equal((await loader.load('account-a')).status, 'error');
  assert.equal((await loader.load('account-a')).status, 'error');
  assert.equal((await loader.load('account-a')).status, 'error');
  assert.equal(requests, 1);
  fails = false;
  assert.equal((await loader.load('account-a', true)).status, 'ready');
  assert.equal(authErrorMessage({ code: 'email_not_confirmed' }), '邮箱尚未验证，请先查收验证邮件');
});

import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as flow from '../src/auth/flow.ts';
const require = createRequire(import.meta.url);

function authStoreHarness({ logoutError = null, initWait = Promise.resolve() } = {}) {
  let current = { user: { id: 'test-owner', email: 'test@example.invalid' } };
  const profiles = { profileStatus: 'ready', setUserId() {}, async ensureUserInfo() {} };
  const storage = { getItem: () => null, setItem() {}, removeItem() {} };
  const client = {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      initialize: async () => {
        await initWait;
        return { error: null };
      },
      getSession: async () => ({ data: { session: current }, error: null }),
      signOut: async () => ({ error: logoutError }),
    },
  };
  const source = fs.readFileSync(new URL('../src/stores/auth.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const dependencies = {
    vue: require('vue'),
    pinia: require('pinia'),
    '@/lib/supabaseClient': {
      supabase: client,
      clearStaleSession: async () => {
        current = null;
        return { error: null };
      },
      initialAuthCallback: { present: false, recovery: false, error: '' },
    },
    './user': { default: () => profiles },
    '@/auth/flow': flow,
  };
  const previousWindow = globalThis.window;
  globalThis.window = { sessionStorage: storage };
  try {
    new Function('require', 'module', 'exports', output)(
      (name) => dependencies[name],
      module,
      module.exports
    );
    dependencies.pinia.setActivePinia(dependencies.pinia.createPinia());
    return module.exports.default();
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

test('auth initialization waits for the real SDK result and shares the pending request', async () => {
  let finish;
  const store = authStoreHarness({
    initWait: new Promise((resolve) => {
      finish = resolve;
    }),
  });
  const first = store.initializeAuth();
  const second = store.initializeAuth();
  assert.equal(store.initialized, false);
  assert.equal(store.isLoggedIn, false);
  finish();
  await Promise.all([first, second]);
  assert.equal(store.initialized, true);
  assert.equal(store.user.id, 'test-owner');
});

test('already missing auth session completes sign-out instead of trapping the stale UI', async () => {
  const store = authStoreHarness({ logoutError: { name: 'AuthSessionMissingError', status: 400 } });
  await store.initializeAuth();
  assert.equal(store.isLoggedIn, true);
  assert.equal((await store.logout()).error, null);
  assert.equal(store.isLoggedIn, false);
  assert.equal(store.recovery, false);
  await store.initializeAuth(true);
  assert.equal(store.isLoggedIn, false);
});

test('a network sign-out failure preserves the session for an explicit retry', async () => {
  const failure = new TypeError('Failed to fetch');
  const store = authStoreHarness({ logoutError: failure });
  await store.initializeAuth();
  assert.equal((await store.logout()).error, failure);
  assert.equal(store.isLoggedIn, true);
  assert.equal(flow.authErrorMessage(failure), '网络连接失败，请检查网络后重试');
});

import { createSessionStorage, discardMissingSession } from '../src/auth/storage.ts';

test('discarding a missing session removes only SDK session keys and survives storage restrictions', () => {
  const storage = createSessionStorage();
  for (const suffix of ['', '-user', '-code-verifier'])
    storage.setItem('sdk-owned' + suffix, 'test-only');
  storage.setItem('unrelated-setting', 'keep');
  discardMissingSession(storage, 'sdk-owned');
  for (const suffix of ['', '-user', '-code-verifier'])
    assert.equal(storage.getItem('sdk-owned' + suffix), null);
  assert.equal(storage.getItem('unrelated-setting'), 'keep');
  const blocked = createSessionStorage({
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
    removeItem() {
      throw new Error('blocked');
    },
  });
  blocked.setItem('sdk', 'test-only');
  assert.equal(blocked.getItem('sdk'), 'test-only');
  discardMissingSession(blocked, 'sdk');
  assert.equal(blocked.getItem('sdk'), null);
});
