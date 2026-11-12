import { createClient } from '@supabase/supabase-js';

import { readAuthCallback } from '@/auth/flow';
import { createSessionStorage, discardMissingSession } from '@/auth/storage';

export const initialAuthCallback = readAuthCallback(window.location.href);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const storageKey = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
const storage = createSessionStorage(
  (() => {
    try {
      return window.localStorage;
    } catch {
      return undefined;
    }
  })()
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage,
    storageKey,
  },
});

// Older Auth clients may return a missing-session error before removing a stale
// session. Remove only SDK-owned keys, then let its normal sign-out notify tabs.
export async function clearStaleSession() {
  discardMissingSession(storage, storageKey);
  return supabase.auth.signOut({ scope: 'local' });
}
