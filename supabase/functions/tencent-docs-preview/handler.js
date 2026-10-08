const CLIENT_ID = "d9d6946c42004ca8adcfdaf55770c366";
const SHARE_ID = "DZnVPZ0JhTGVWdFZi";
const SHEET_IDS = ["BB08J2", "BB08J3"];
const RANGE = "A1:Z5";

class PublicError extends Error {
  constructor(status, details) {
    super("Tencent Docs inspection failed");
    this.status = status;
    this.details = details;
  }
}

function response(body, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

function serviceKey(env) {
  try {
    const value = JSON.parse(env.SUPABASE_SECRET_KEYS || "{}").default;
    const resolved = typeof value === "string" ? env[value] || value : "";
    if (resolved.startsWith("sb_secret_")) return resolved;
  } catch { /* Legacy runtime fallback. */ }
  return env.SUPABASE_SERVICE_ROLE_KEY || "";
}

async function hash(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))),
    (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeProviderCode(value) {
  const code = String(value ?? "");
  return /^[A-Za-z0-9_-]{1,40}$/.test(code) ? code : undefined;
}

function safeError(error) {
  return error instanceof PublicError ? error.details : { stage: "internal", message: "检查暂时失败。" };
}

function text(value) {
  const cell = value?.cellValue ?? value;
  if (typeof cell?.text === "string") return cell.text.slice(0, 2000);
  if (typeof cell?.number === "number") return String(cell.number);
  if (typeof cell?.bool === "boolean") return String(cell.bool);
  return "";
}

function headerRows(gridData) {
  const grids = Array.isArray(gridData) ? gridData : [gridData];
  return grids.filter(Boolean).flatMap((grid) => (grid.rows || []).slice(0, 5).map((row, index) => ({
    row: (grid.startRow || 0) + index + 1,
    startColumn: grid.startColumn || 0,
    cells: (row.values || []).slice(0, 26).map(text),
  })));
}

export function createHandler(env, { fetcher = fetch } = {}) {
  const clientId = env.TENCENT_DOCS_CLIENT_ID || CLIENT_ID;
  const accessToken = (env.TENCENT_DOCS_ACCESS_TOKEN || "").trim();
  const openId = (env.TENCENT_DOCS_OPEN_ID || "").trim();
  const supabaseUrl = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = serviceKey(env);
  const configured = Boolean(accessToken && openId && key && /^https:\/\//.test(supabaseUrl));

  async function consumeCapability(capability) {
    try {
      const result = await fetcher(`${supabaseUrl}/rest/v1/rpc/consume_tencent_docs_inspection_token`, {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json",
          ...(key.startsWith("eyJ") ? { Authorization: `Bearer ${key}` } : {}) },
        body: JSON.stringify({ p_token_hash: await hash(capability) }),
        signal: AbortSignal.timeout(8000), redirect: "error",
      });
      if (!result.ok) throw new Error("Storage failed");
      return await result.json() === true;
    } catch {
      throw new PublicError(503, { stage: "capability", message: "检查凭证存储暂时不可用。" });
    }
  }

  async function readProvider(stage, path, query = {}) {
    const url = new URL(path, "https://docs.qq.com");
    // The paths below are fixed by this handler; user input never chooses a host or document.
    if (url.origin !== "https://docs.qq.com" || !url.pathname.startsWith("/openapi/")) {
      throw new PublicError(500, { stage, message: "接口地址无效。" });
    }
    url.search = new URLSearchParams(query).toString();
    let result;
    let body;
    try {
      result = await fetcher(url, {
        method: "GET", redirect: "error", signal: AbortSignal.timeout(15000),
        headers: { "Access-Token": accessToken, "Client-Id": clientId, "Open-Id": openId, Accept: "application/json" },
      });
      body = await result.json();
    } catch {
      throw new PublicError(502, { stage, httpStatus: result?.status, message: "腾讯接口未返回有效 JSON。" });
    }
    const code = body?.ret ?? body?.code;
    if (!result.ok || (code !== undefined && String(code) !== "0")) {
      // Do not return provider messages/details, which can include credential values.
      throw new PublicError(502, { stage, httpStatus: result.status, providerCode: safeProviderCode(code),
        message: "腾讯接口拒绝了请求。" });
    }
    return body?.data ?? body;
  }

  return async (request) => {
    try {
      const path = new URL(request.url).pathname.replace(/^\/(?:functions\/v1\/)?tencent-docs-preview(?=\/|$)/, "") || "/";
      if ((path === "/" || path === "/status") && request.method === "GET") {
        return response({ service: "tencent-docs-preview", mode: "developer_token", configured,
          credentialsPresent: { accessToken: Boolean(accessToken), openId: Boolean(openId) }, clientId, shareId: SHARE_ID });
      }
      if (path !== "/inspect" && path !== "/snapshot") return response({ message: "地址不存在。" }, 404);
      if (request.method !== "POST") return response({ message: "检查需要 POST 请求。" }, 405);
      if (!configured) return response({ message: "请配置 TENCENT_DOCS_ACCESS_TOKEN 和 TENCENT_DOCS_OPEN_ID。" }, 503);
      const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get("Authorization") || "");
      if (!match || !await consumeCapability(match[1])) return response({ message: "检查凭证无效、已使用或已过期。" }, 403);

      const converted = await readProvider("convert", "/openapi/drive/v2/util/converter", { type: "2", value: SHARE_ID });
      const fileId = converted?.fileID;
      if (typeof fileId !== "string" || !fileId || fileId.length > 512) {
        throw new PublicError(502, { stage: "convert", message: "腾讯没有返回有效的文件 ID。" });
      }
      const encoded = encodeURIComponent(fileId);
      if (path === "/snapshot") {
        const metadata = await readProvider("sheets", `/openapi/spreadsheet/v3/files/${encoded}`, { concise: "0" });
        const access = await readProvider("access", `/openapi/drive/v2/files/${encoded}/access`);
        const properties = metadata.properties || [];
        const snapshots = [];
        for (const sheetId of SHEET_IDS) {
          const property = properties.find((sheet) => sheet.sheetId === sheetId);
          const rows = property?.rowCount;
          const cols = property?.columnCount;
          if (!Number.isInteger(rows) || !Number.isInteger(cols) || rows < 1 || cols < 1 || rows > 5000 || cols > 100) {
            throw new PublicError(502, { stage: `snapshot:${sheetId}`, message: "工作表范围无法安全读取。" });
          }
          let letters = "";
          for (let n = cols; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + (n - 1) % 26) + letters;
          const chunks = [];
          const chunkSize = Math.min(1000, Math.floor(10000 / cols));
          for (let row = 1; row <= rows; row += chunkSize) {
            const range = `A${row}:${letters}${Math.min(rows, row + chunkSize - 1)}`;
            const data = await readProvider(`snapshot:${sheetId}`, `/openapi/spreadsheet/v3/files/${encoded}/${sheetId}/${range}`);
            chunks.push({ range, gridData: data.gridData });
          }
          snapshots.push({ sheetId, property, chunks });
        }
        return response({ readOnly: true, fileId, shareId: SHARE_ID, captureTime: new Date().toISOString(), access, snapshots });
      }
      const [metadataResult, accessResult, ...rangeResults] = await Promise.allSettled([
        readProvider("sheets", `/openapi/spreadsheet/v3/files/${encoded}`, { concise: "0" }),
        readProvider("access", `/openapi/drive/v2/files/${encoded}/access`),
        ...SHEET_IDS.map((sheetId) => readProvider(`headers:${sheetId}`,
          `/openapi/spreadsheet/v3/files/${encoded}/${sheetId}/${RANGE}`)),
      ]);
      const metadata = metadataResult.status === "fulfilled" ? metadataResult.value : null;
      const access = accessResult.status === "fulfilled" ? accessResult.value : null;
      const properties = Array.isArray(metadata?.properties) ? metadata.properties : [];
      const issues = [metadataResult, accessResult, ...rangeResults]
        .filter((result) => result.status === "rejected").map((result) => safeError(result.reason));
      return response({ readOnly: true, shareId: SHARE_ID, fileId,
        access: access ? { readEnable: access.readEnable, editEnable: access.editEnable, isOwner: access.isOwner } : null,
        sheets: properties.map((sheet) => ({ sheetId: sheet.sheetId, title: sheet.title,
          rowCount: sheet.rowCount, columnCount: sheet.columnCount, rowTotal: sheet.rowTotal, columnTotal: sheet.columnTotal })),
        headers: rangeResults.map((result, index) => ({ sheetId: SHEET_IDS[index], range: RANGE,
          rows: result.status === "fulfilled" ? headerRows(result.value?.gridData) : [] })), issues });
    } catch (error) {
      return response(safeError(error), error instanceof PublicError ? error.status : 500);
    }
  };
}
