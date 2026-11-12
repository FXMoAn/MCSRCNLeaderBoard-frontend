import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import type { Session } from '@supabase/supabase-js';
import { supabase, initialAuthCallback, clearStaleSession } from '@/lib/supabaseClient';
import useUserStore from './user';
import {
  authErrorMessage,
  isMissingSessionError,
  callbackUrl,
  EMAIL_COOLDOWN_MS,
  RECOVERY_CONTEXT_KEY,
  normalizeEmail,
  readEmailContext,
  safeRedirect,
  writeEmailContext,
  type EmailContext,
} from '@/auth/flow';

const useAuthStore = defineStore('auth', () => {
  const profiles = useUserStore();
  const session = ref<Session | null>(null);
  const user = computed(() => session.value?.user ?? null);
  const initialized = ref(false);
  const initializing = ref(false);
  const initializationError = ref('');
  const callbackError = ref(initialAuthCallback.error);
  const recovery = ref(false);
  const working = ref(0);
  const loading = computed(() => initializing.value || working.value > 0);
  const isLoggedIn = computed(() => !!session.value?.user);
  const storage = (() => {
    try {
      return window.sessionStorage;
    } catch {
      return undefined;
    }
  })();
  const emailContext = ref<EmailContext | null>(readEmailContext(storage));
  let initialization: Promise<void> | null = null;
  let subscribed = false;
  let logoutRequest: Promise<{ error: unknown }> | null = null;

  function setRecovery(value: boolean) {
    recovery.value = value;
    try {
      if (value && user.value)
        storage?.setItem(
          RECOVERY_CONTEXT_KEY,
          JSON.stringify({ owner: user.value.id, until: Date.now() + 15 * 60_000 })
        );
      else storage?.removeItem(RECOVERY_CONTEXT_KEY);
    } catch {
      /* A recovery link still works without sessionStorage. */
    }
  }
  function synchronize(next: Session | null, event = '') {
    const previousOwner = session.value?.user.id;
    session.value = next;
    profiles.setUserId(next?.user.id ?? null);
    if (!next || (previousOwner && previousOwner !== next.user.id)) setRecovery(false);
    if (next) initializationError.value = '';
    if (event === 'PASSWORD_RECOVERY' && next) setRecovery(true);
    if (next && previousOwner !== next.user.id) {
      // Keep Supabase requests outside its synchronous auth notification callback.
      setTimeout(() => {
        if (user.value?.id === next.user.id) void profiles.ensureUserInfo();
      }, 0);
    }
  }

  async function initializeAuth(retry = false): Promise<void> {
    if (initialization) return initialization;
    if (initialized.value && !retry) return;
    initializing.value = true;
    initializationError.value = '';
    if (!subscribed) {
      supabase.auth.onAuthStateChange((event, next) => synchronize(next, event));
      subscribed = true;
    }
    initialization = (async () => {
      try {
        const { error: linkError } = await supabase.auth.initialize();
        if (linkError && initialAuthCallback.present && !retry)
          callbackError.value = authErrorMessage(linkError);
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        synchronize(data.session);
        if (data.session && !callbackError.value) {
          if (initialAuthCallback.recovery) setRecovery(true);
          try {
            const saved = JSON.parse(storage?.getItem(RECOVERY_CONTEXT_KEY) || 'null');
            if (
              saved?.owner === data.session.user.id &&
              saved.until > Date.now() &&
              saved.until <= Date.now() + 15 * 60_000
            )
              recovery.value = true;
          } catch {
            /* Ignore stale recovery UI state. */
          }
        }
      } catch (error) {
        if (isMissingSessionError(error)) {
          await clearStaleSession();
          synchronize(null);
        } else initializationError.value = authErrorMessage(error);
      } finally {
        initialized.value = true;
        initializing.value = false;
        initialization = null;
      }
    })();
    return initialization;
  }

  async function ensureProfile(force = false) {
    await initializeAuth();
    if (user.value) await profiles.ensureUserInfo(force);
    return profiles.profileStatus;
  }
  function rememberEmail(
    email: string,
    purpose: EmailContext['purpose'],
    redirect: unknown,
    sent: boolean
  ) {
    const previous = emailContext.value;
    const retainedRetry =
      previous?.email === normalizeEmail(email) && previous.purpose === purpose
        ? previous.retryAt
        : 0;
    emailContext.value = {
      email: normalizeEmail(email),
      purpose,
      redirect: safeRedirect(redirect),
      retryAt: sent ? Date.now() + EMAIL_COOLDOWN_MS : retainedRetry,
      expiresAt: Date.now() + 30 * 60_000,
    };
    writeEmailContext(storage, emailContext.value);
  }
  function clearEmailContext() {
    emailContext.value = null;
    writeEmailContext(storage, null);
  }
  function retrySeconds(email: string, purpose: EmailContext['purpose'], now = Date.now()) {
    const context = emailContext.value;
    return context?.email === normalizeEmail(email) && context.purpose === purpose
      ? Math.max(0, Math.ceil((context.retryAt - now) / 1000))
      : 0;
  }
  async function login(email: string, password: string) {
    working.value++;
    try {
      await initializeAuth();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });
      if (error) return { data: null, error };
      callbackError.value = '';
      setRecovery(false);
      synchronize(data.session);
      clearEmailContext();
      await ensureProfile(true);
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    } finally {
      working.value--;
    }
  }
  async function signup(email: string, password: string, redirect: unknown = '/rank') {
    working.value++;
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizeEmail(email),
        password,
        options: { emailRedirectTo: callbackUrl(window.location.origin, 'signup', redirect) },
      });
      if (error?.status === 429) rememberEmail(email, 'signup', redirect, true);
      if (!error) {
        rememberEmail(email, 'signup', redirect, true);
        if (data.session) synchronize(data.session);
      }
      return { data, error };
    } catch (error) {
      return { data: null, error };
    } finally {
      working.value--;
    }
  }
  async function sendEmail(
    email: string,
    purpose: EmailContext['purpose'],
    redirect: unknown = '/rank'
  ) {
    if (retrySeconds(email, purpose)) return { error: { code: 'over_email_send_rate_limit' } };
    working.value++;
    try {
      const result =
        purpose === 'signup'
          ? await supabase.auth.resend({
              type: 'signup',
              email: normalizeEmail(email),
              options: { emailRedirectTo: callbackUrl(window.location.origin, purpose, redirect) },
            })
          : await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
              redirectTo: callbackUrl(window.location.origin, purpose, redirect),
            });
      if (!result.error || result.error.status === 429)
        rememberEmail(email, purpose, redirect, true);
      return { error: result.error };
    } catch (error) {
      return { error };
    } finally {
      working.value--;
    }
  }
  async function logout(): Promise<{ error: unknown }> {
    if (logoutRequest) return logoutRequest;
    logoutRequest = (async () => {
      working.value++;
      try {
        const { error } = await supabase.auth.signOut();
        if (error && !isMissingSessionError(error)) return { error };
        if (isMissingSessionError(error)) {
          const cleared = await clearStaleSession();
          if (cleared.error) return { error: cleared.error };
        }
        synchronize(null);
        setRecovery(false);
        clearEmailContext();
        return { error: null };
      } catch (error) {
        return { error };
      } finally {
        working.value--;
        logoutRequest = null;
      }
    })();
    return logoutRequest;
  }
  async function updatePassword(password: string) {
    if (!recovery.value || !user.value) return { error: { code: 'otp_expired' } };
    try {
      return { error: (await supabase.auth.updateUser({ password })).error };
    } catch (error) {
      return { error };
    }
  }
  return {
    session,
    user,
    initialized,
    initializing,
    initializationError,
    callbackError,
    recovery,
    loading,
    isLoggedIn,
    isAuthenticated: isLoggedIn,
    emailContext,
    initializeAuth,
    ensureProfile,
    login,
    signup,
    logout,
    updatePassword,
    rememberEmail,
    clearEmailContext,
    retrySeconds,
    sendEmail,
  };
});
export default useAuthStore;
