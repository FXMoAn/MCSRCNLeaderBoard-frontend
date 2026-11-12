export const MIN_PASSWORD_LENGTH = 8;
export const EMAIL_COOLDOWN_MS = 60_000;
export const EMAIL_CONTEXT_KEY = 'mcsrcn:auth-email';
export const RECOVERY_CONTEXT_KEY = 'mcsrcn:password-recovery';

export function safeRedirect(value: unknown, fallback = '/rank'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//'))
    return fallback;
  if (/[\\\u0000-\u0020\u007f]/.test(value)) return fallback;
  try {
    const url = new URL(value, 'https://local.invalid');
    if (url.origin !== 'https://local.invalid') return fallback;
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, '') || '/';
    if (path.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(path)) return fallback;
    if (
      /^\/(login|user\/login|signup|verify-email|forgot-password|reset-password|auth\/callback)(\/|$)/.test(
        path
      )
    )
      return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function emailError(value: string): string {
  if (!value.trim()) return '请输入邮箱';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? '' : '请输入有效的邮箱地址';
}

export function passwordError(value: string, creating = false): string {
  if (!value) return '请输入密码';
  return creating && value.length < MIN_PASSWORD_LENGTH ? `密码至少 ${MIN_PASSWORD_LENGTH} 位` : '';
}

export function authErrorCode(error: unknown): string {
  return typeof error === 'object' && error !== null && 'code' in error
    ? String(error.code ?? '')
    : '';
}

export function isMissingSessionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return (
    ('name' in error && error.name === 'AuthSessionMissingError') ||
    ['session_not_found', 'refresh_token_not_found', 'refresh_token_already_used'].includes(
      authErrorCode(error)
    )
  );
}

export function authErrorMessage(error: unknown): string {
  if (isMissingSessionError(error)) return '登录已过期，请重新登录';
  const code = authErrorCode(error);
  const messages: Record<string, string> = {
    invalid_credentials: '邮箱或密码不正确',
    email_not_confirmed: '邮箱尚未验证，请先查收验证邮件',
    weak_password: `密码不符合要求，请使用至少 ${MIN_PASSWORD_LENGTH} 位的新密码`,
    same_password: '新密码不能与原密码相同',
    over_email_send_rate_limit: '邮件发送过于频繁，请稍后重试',
    over_request_rate_limit: '操作过于频繁，请稍后重试',
    email_address_invalid: '请输入有效的邮箱地址',
    signup_disabled: '暂时无法注册，请稍后重试',
    otp_expired: '邮件链接已失效，请重新申请',
    bad_code_verifier: '验证未完成，请重新打开邮件链接',
    session_not_found: '登录已过期，请重新登录',
    refresh_token_not_found: '登录已过期，请重新登录',
    user_already_exists: '暂时无法注册，请尝试登录或找回密码',
    email_exists: '暂时无法注册，请尝试登录或找回密码',
  };
  if (messages[code]) return messages[code];
  if (
    error instanceof TypeError ||
    (error instanceof Error && /fetch|network|timeout|abort/i.test(error.message))
  ) {
    return '网络连接失败，请检查网络后重试';
  }
  return '操作未完成，请稍后重试';
}

export interface EmailContext {
  email: string;
  purpose: 'signup' | 'recovery';
  redirect: string;
  retryAt: number;
  expiresAt: number;
}

export interface SmallStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function readEmailContext(storage?: SmallStorage, now = Date.now()): EmailContext | null {
  try {
    const value = JSON.parse(storage?.getItem(EMAIL_CONTEXT_KEY) || 'null');
    if (
      !value ||
      !['signup', 'recovery'].includes(value.purpose) ||
      typeof value.email !== 'string' ||
      emailError(value.email) ||
      !Number.isFinite(value.retryAt) ||
      !Number.isFinite(value.expiresAt) ||
      value.expiresAt <= now ||
      value.expiresAt > now + 3_600_000
    )
      return null;
    return { ...value, redirect: safeRedirect(value.redirect) };
  } catch {
    return null;
  }
}

export function writeEmailContext(storage: SmallStorage | undefined, value: EmailContext | null) {
  try {
    if (value) storage?.setItem(EMAIL_CONTEXT_KEY, JSON.stringify(value));
    else storage?.removeItem(EMAIL_CONTEXT_KEY);
  } catch {
    /* In-memory state still works when browser storage is unavailable. */
  }
}

export interface AuthCallbackContext {
  present: boolean;
  recovery: boolean;
  error: string;
}

export function readAuthCallback(href: string): AuthCallbackContext {
  const url = new URL(href);
  const hash = new URLSearchParams(url.hash.slice(1));
  const code = hash.get('error_code') || url.searchParams.get('error_code');
  const error = hash.get('error') || url.searchParams.get('error');
  return {
    present:
      hash.has('access_token') ||
      hash.has('error') ||
      url.searchParams.has('code') ||
      url.searchParams.has('error'),
    recovery: hash.get('type') === 'recovery',
    error: code ? authErrorMessage({ code }) : error ? '邮件验证未完成，请重新申请' : '',
  };
}

export function callbackUrl(
  origin: string,
  purpose: 'signup' | 'recovery',
  redirect: unknown
): string {
  const url = new URL('/auth/callback', origin);
  url.searchParams.set('flow', purpose);
  url.searchParams.set('redirect', safeRedirect(redirect));
  return url.href;
}

export function clearCallbackParameters() {
  const url = new URL(window.location.href);
  for (const key of ['code', 'error', 'error_code', 'error_description'])
    url.searchParams.delete(key);
  if (/access_token=|refresh_token=|error=|type=recovery/.test(url.hash)) url.hash = '';
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}
