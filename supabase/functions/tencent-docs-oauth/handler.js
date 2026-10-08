const CLIENT_ID = "d9d6946c42004ca8adcfdaf55770c366";
const FUNCTION_PATH = "/functions/v1/tencent-docs-oauth";
const COOKIE_NAME = "__Host-tencent_docs_oauth";
const REQUIRED_SCOPES = [
  "scope.sheet.editable",
  "scope.sheet.readonly",
  "scope.file.queryable",
];
const encoder = new TextEncoder();
const capabilityPattern = /^[A-Za-z0-9_-]{43}$/;

class PublicError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function randomCapability() {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

async function hash(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function browserCookie(request) {
  for (const part of (request.headers.get("cookie") || "").split(";")) {
    const [name, ...values] = part.trim().split("=");
    if (name === COOKIE_NAME) return values.join("=");
  }
  return "";
}

function cookie(value, maxAge) {
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

function response(body, status = 200, extraHeaders = {}) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": typeof body === "string"
        ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      ...extraHeaders,
    },
  });
}

function serviceKey(env) {
  // New keys belong in apikey, not in the Authorization bearer header.
  try {
    const keys = JSON.parse(env.SUPABASE_SECRET_KEYS || "{}");
    const value = keys.default;
    if (typeof value === "string") {
      const resolved = env[value] || value;
      if (resolved.startsWith("sb_secret_")) return resolved;
    }
  } catch { /* Older projects expose the legacy service key below. */ }
  return env.SUPABASE_SERVICE_ROLE_KEY || "";
}

async function encryptCredentials(secret, clientId, openId, credentials) {
  const material = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), "HKDF", false, ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey({
    name: "HKDF",
    hash: "SHA-256",
    salt: encoder.encode(clientId),
    info: encoder.encode("tencent-docs-credentials:v1"),
  }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({
    name: "AES-GCM", iv,
    additionalData: encoder.encode(`${clientId}:${openId}`),
  }, key, encoder.encode(JSON.stringify(credentials)));
  return { version: 1, algorithm: "AES-GCM", iv: base64url(iv), data: base64url(new Uint8Array(encrypted)) };
}

export function createHandler(env, { fetcher = fetch, now = Date.now } = {}) {
  const clientId = env.TENCENT_DOCS_CLIENT_ID || CLIENT_ID;
  const secret = env.TENCENT_DOCS_CLIENT_SECRET || "";
  const supabaseUrl = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = serviceKey(env);
  // Use the trusted server configuration, never a request Host or redirect query.
  const redirectUri = `${supabaseUrl}${FUNCTION_PATH}/callback`;
  const configured = Boolean(secret && key && /^https:\/\//.test(supabaseUrl));
  const developerTokenConfigured = Boolean(env.TENCENT_DOCS_ACCESS_TOKEN && env.TENCENT_DOCS_OPEN_ID);

  async function storage(action, payload) {
    let result;
    try {
      result = await fetcher(`${supabaseUrl}/rest/v1/rpc/tencent_docs_oauth_storage`, {
        method: "POST",
        headers: {
          apikey: key, "Content-Type": "application/json",
          ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}),
        },
        body: JSON.stringify({ p_action: action, p_payload: payload }),
        signal: AbortSignal.timeout(8000),
        redirect: "error",
      });
      if (!result.ok) {
        // Record only operation/status, never request headers, payloads or errors.
        console.error("tencent_docs_storage_http_error", { action, status: result.status });
        throw new Error("storage unavailable");
      }
      return await result.json();
    } catch {
      throw new PublicError(503, "授权存储暂时不可用，请重新获取授权链接后再试。");
    }
  }

  async function exchangeCode(code) {
    const tokenUrl = new URL("https://docs.qq.com/oauth/v2/token");
    tokenUrl.search = new URLSearchParams({
      client_id: clientId, client_secret: secret,
      redirect_uri: redirectUri, grant_type: "authorization_code", code,
    }).toString();
    let token;
    try {
      // Tencent requires GET. Never log this URL, the response, or fetch errors.
      const result = await fetcher(tokenUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(10000), redirect: "error",
      });
      if (!result.ok) throw new Error("exchange failed");
      token = await result.json();
    } catch {
      throw new PublicError(502, "腾讯授权码交换失败，请检查应用密钥和回调地址后重新授权。");
    }
    if (!token || typeof token.access_token !== "string" || !token.access_token
      || typeof token.refresh_token !== "string" || !token.refresh_token
      || typeof token.user_id !== "string" || !token.user_id
      || !Number.isSafeInteger(token.expires_in) || token.expires_in <= 0
      || token.expires_in > 366 * 86400 || typeof token.scope !== "string") {
      throw new PublicError(502, "腾讯返回的授权信息不完整，请重新授权。");
    }
    const scopes = token.scope.split(",").map((scope) => scope.trim()).filter(Boolean);
    const missing = REQUIRED_SCOPES.filter((scope) => !scopes.includes(scope));
    if (missing.length) {
      throw new PublicError(403, `腾讯应用还缺少权限：${missing.join("、")}。请开通后重新授权。`);
    }
    return { token, scopes };
  }

  return async function handler(request) {
    let clearCookie = false;
    try {
      const url = new URL(request.url);
      // The hosted runtime strips /functions/v1; local requests may retain it.
      const route = url.pathname.replace(/^\/(?:functions\/v1\/)?tencent-docs-oauth(?=\/|$)/, "") || "/";
      if (request.method !== "GET") return response("只支持 GET。", 405, { Allow: "GET" });
      if (route === "/" || route === "/status") {
        return response({ service: "tencent-docs-oauth", configured: developerTokenConfigured || configured,
          mode: developerTokenConfigured ? "developer_token" : "oauth", clientId, redirectUri });
      }
      if (route !== "/start" && route !== "/callback") return response("地址不存在。", 404);
      if (developerTokenConfigured) return response("当前使用开发者后台凭据接入，无需回调授权。", 410);
      if (!configured) throw new PublicError(503, "请先在 Supabase 后台配置 TENCENT_DOCS_CLIENT_SECRET。");

      if (route === "/start") {
        const setup = url.searchParams.get("setup") || "";
        if (!capabilityPattern.test(setup)) throw new PublicError(403, "请使用管理员生成的一次性授权链接。");
        const state = randomCapability();
        // A preview or a second open must neither consume setup nor replace
        // this browser's binding for an already-open authorization page.
        const existingBrowser = browserCookie(request);
        const browser = capabilityPattern.test(existingBrowser) ? existingBrowser : randomCapability();
        const result = await storage("begin", {
          setup_hash: await hash(setup), state_hash: await hash(state), browser_hash: await hash(browser),
        });
        if (!result?.valid) throw new PublicError(403, "授权链接已失效或已使用，请重新获取。");
        const authorizeUrl = new URL("https://docs.qq.com/oauth/v2/authorize");
        authorizeUrl.search = new URLSearchParams({
          client_id: clientId, redirect_uri: redirectUri,
          new_login: "1", response_type: "code", scope: "all", state,
        }).toString();
        return response("正在前往腾讯文档授权。", 303, {
          Location: authorizeUrl.toString(), "Set-Cookie": cookie(browser, 600),
        });
      }

      const state = url.searchParams.get("state") || "";
      const browser = browserCookie(request);
      if (!capabilityPattern.test(state) || !capabilityPattern.test(browser)) {
        throw new PublicError(400, "授权校验失败，请从一次性授权链接重新开始，并使用同一浏览器完成授权。");
      }
      // Provider errors and incomplete callbacks must not burn the setup link.
      if (url.searchParams.has("error")) throw new PublicError(400, "腾讯文档授权未完成，请重新打开授权链接。");
      const code = url.searchParams.get("code") || "";
      if (!code || code.length > 4096 || /[\x00-\x20\x7f]/.test(code)) {
        throw new PublicError(400, "缺少有效的腾讯授权码，请重新开始。");
      }
      const result = await storage("claim", { state_hash: await hash(state), browser_hash: await hash(browser) });
      if (!result?.valid) throw new PublicError(400, "授权请求已过期、已使用，或浏览器不匹配，请重新开始。");
      clearCookie = true;
      const { token, scopes } = await exchangeCode(code);
      const accessExpiresAt = new Date(now() + token.expires_in * 1000).toISOString();
      const encrypted = await encryptCredentials(secret, clientId, token.user_id, {
        access_token: token.access_token, refresh_token: token.refresh_token,
        token_type: token.token_type || "Bearer", access_expires_at: accessExpiresAt,
      });
      const saved = await storage("save", {
        client_id: clientId, open_id: token.user_id, encrypted_credentials: encrypted,
        access_expires_at: accessExpiresAt, scopes,
      });
      if (!saved?.saved) throw new PublicError(503, "授权保存失败，请重新获取链接后再试。");
      return response("腾讯文档授权已保存，可以关闭本页。排行榜同步尚未启用，本次没有修改任何文档或成绩。", 200, {
        "Set-Cookie": cookie("", 0),
      });
    } catch (error) {
      // Provider errors can contain credentials. Only return our own fixed messages.
      return response(error instanceof PublicError ? error.message : "授权处理失败，请重新获取链接后再试。",
        error instanceof PublicError ? error.status : 500,
        clearCookie ? { "Set-Cookie": cookie("", 0) } : {});
    }
  };
}
