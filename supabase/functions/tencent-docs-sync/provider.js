const DEFAULT_CLIENT_ID = "d9d6946c42004ca8adcfdaf55770c366";
const SHARE_ID = "DZnVPZ0JhTGVWdFZi";
const ORIGIN = "https://docs.qq.com";
const READ_TIMEOUT_MS = 15000;
const WRITE_TIMEOUT_MS = 20000;
const MAX_CELLS = 10000;
const MAX_ROWS = 1000;
const MAX_COLUMNS = 200;

export class ProviderError extends Error {
  constructor(stage, status, code) {
    super("腾讯文档接口处理失败。");
    this.name = "ProviderError";
    this.stage = stage;
    this.status = status;
    this.code = code;
    this.details = { stage, status, code };
  }
}

const object = (value) => value !== null && typeof value === "object"
  && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const integer = (value) => Number.isSafeInteger(value) && value >= 0;
const filePattern = /^[A-Za-z0-9_$-]{1,512}$/;
const sheetPattern = /^[A-Za-z0-9_-]{1,128}$/;

function invalid(stage, code = "INVALID_INPUT") {
  throw new ProviderError(stage, 400, code);
}

function keys(value, allowed, stage, required = []) {
  if (!object(value) || Object.keys(value).some((key) => !allowed.includes(key))
    || required.some((key) => !own(value, key))) invalid(stage);
}

function dense(array, stage) {
  if (!Array.isArray(array) || array.length === 0) invalid(stage);
  for (let index = 0; index < array.length; index += 1) {
    if (!own(array, index) || array[index] === undefined) invalid(stage);
  }
}

function columnName(index) {
  let number = index + 1;
  let name = "";
  while (number > 0) {
    number -= 1;
    name = String.fromCharCode(65 + number % 26) + name;
    number = Math.floor(number / 26);
  }
  return name;
}

function validateCell(cell, stage) {
  keys(cell, ["cellValue", "cellFormat", "dataType"], stage, ["cellValue"]);
  keys(cell.cellValue, ["text", "number", "link"], stage);
  const valueKeys = Object.keys(cell.cellValue);
  if (valueKeys.length !== 1) invalid(stage);
  const type = valueKeys[0];
  const value = cell.cellValue[type];
  if (type === "text" && typeof value !== "string") invalid(stage);
  if (type === "number" && (typeof value !== "number" || !Number.isFinite(value))) invalid(stage);
  if (type === "link") {
    keys(value, ["url", "text", "overwrite"], stage, ["url", "text", "overwrite"]);
    if (typeof value.url !== "string" || typeof value.text !== "string") invalid(stage);
    if (value.overwrite !== true) invalid(stage, "LINK_OVERWRITE_REQUIRED");
    let url;
    try { url = new URL(value.url); } catch { invalid(stage); }
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) invalid(stage);
  }
  if (own(cell, "dataType") && !["DATA_TYPE_UNSPECIFIED", "SELECT", "TIME", "LOCATION", "STAR"].includes(cell.dataType)) {
    invalid(stage);
  }
  if (own(cell, "cellFormat")) {
    keys(cell.cellFormat, ["textFormat"], stage, ["textFormat"]);
    const format = cell.cellFormat.textFormat;
    keys(format, ["font", "fontSize", "bold", "italic", "strikethrough", "underline", "color"], stage);
    if (own(format, "font") && typeof format.font !== "string") invalid(stage);
    if (own(format, "fontSize") && (typeof format.fontSize !== "number"
      || !Number.isFinite(format.fontSize) || format.fontSize <= 0 || format.fontSize > 72)) invalid(stage);
    for (const name of ["bold", "italic", "strikethrough", "underline"]) {
      if (own(format, name) && typeof format[name] !== "boolean") invalid(stage);
    }
    if (own(format, "color")) {
      keys(format.color, ["red", "green", "blue", "alpha"], stage);
      for (const channel of Object.values(format.color)) {
        if (!Number.isInteger(channel) || channel < 0 || channel > 255) invalid(stage);
      }
    }
  }
}

function validateGrid(gridData, stage) {
  keys(gridData, ["startRow", "startColumn", "rows"], stage, ["startRow", "startColumn", "rows"]);
  if (!integer(gridData.startRow) || !integer(gridData.startColumn)) invalid(stage);
  dense(gridData.rows, stage);
  if (gridData.rows.length > MAX_ROWS) invalid(stage, "GRID_TOO_LARGE");
  let expected = 0;
  let width;
  for (const row of gridData.rows) {
    keys(row, ["values"], stage, ["values"]);
    dense(row.values, stage);
    width ??= row.values.length;
    // A rectangular, fully explicit update avoids holes being interpreted as clears.
    if (row.values.length !== width || width > MAX_COLUMNS) invalid(stage, "INVALID_RECTANGLE");
    row.values.forEach((cell) => validateCell(cell, stage));
    expected += row.values.length;
  }
  if (expected > MAX_CELLS || !Number.isSafeInteger(gridData.startRow + gridData.rows.length)
    || !Number.isSafeInteger(gridData.startColumn + width)) invalid(stage, "GRID_TOO_LARGE");
  return expected;
}

function validTitle(title, stage, maximum) {
  if (typeof title !== "string" || !title.trim() || /[\x00-\x1f\x7f]/.test(title)
    || (maximum !== undefined && [...title].length > maximum)) invalid(stage);
}

function safeProviderCode(code) {
  if (typeof code === "number" && Number.isSafeInteger(code)) return code;
  if (typeof code === "string" && /^-?\d{1,12}$/.test(code)) return code;
  return "PROVIDER_ERROR";
}

/**
 * Server-only adapter. Arguments must come from trusted worker code.
 * file() -> string; metadata() -> { properties, ...raw };
 * readSheet() -> { fileId, sheetId, metadata, rowCount, columnCount, grids };
 * copyOriginal() -> { ID, url }; addSheet() -> Properties;
 * writeGrid() -> { updatedCells, expectedCells }.
 * Only file IDs confirmed by file()/copyOriginal() in this instance are allowed.
 * No field-mask or style-preservation guarantee is implied by writeGrid().
 */
export function createProvider(env, { fetcher = fetch } = {}) {
  const accessToken = typeof env?.TENCENT_DOCS_ACCESS_TOKEN === "string" ? env.TENCENT_DOCS_ACCESS_TOKEN.trim() : "";
  const openId = typeof env?.TENCENT_DOCS_OPEN_ID === "string" ? env.TENCENT_DOCS_OPEN_ID.trim() : "";
  const clientId = typeof env?.TENCENT_DOCS_CLIENT_ID === "string" && env.TENCENT_DOCS_CLIENT_ID.trim()
    ? env.TENCENT_DOCS_CLIENT_ID.trim() : DEFAULT_CLIENT_ID;
  const confirmed = new Set();
  let originalPromise;

  function approved(fileId, stage) {
    if (typeof fileId !== "string" || !confirmed.has(fileId)) invalid(stage, "UNCONFIRMED_TARGET");
  }

  function sheet(sheetId, stage) {
    if (typeof sheetId !== "string" || !sheetPattern.test(sheetId)) invalid(stage);
  }

  async function request(stage, path, { query, body, form, write = false } = {}) {
    if (!accessToken || !openId) throw new ProviderError(stage, 503, "NOT_CONFIGURED");
    let result;
    let json;
    try {
      const url = new URL(path, ORIGIN);
      if (url.origin !== ORIGIN || !url.pathname.startsWith("/openapi/")) invalid(stage);
      if (query) url.search = new URLSearchParams(query).toString();
      const headers = { "Access-Token": accessToken, "Client-Id": clientId, "Open-Id": openId, Accept: "application/json" };
      let payload;
      if (body !== undefined) {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
      } else if (form !== undefined) {
        headers["Content-Type"] = "application/x-www-form-urlencoded";
        payload = new URLSearchParams(form).toString();
      }
      result = await fetcher(url, {
        method: write ? "POST" : "GET", headers, body: payload,
        redirect: "error", signal: AbortSignal.timeout(write ? WRITE_TIMEOUT_MS : READ_TIMEOUT_MS),
      });
      if (result.redirected) throw new ProviderError(stage, 502, "REDIRECT_REJECTED");
      json = await result.json();
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(stage, result?.status || 502, result ? "INVALID_JSON" : "REQUEST_FAILED");
    }
    const code = json?.ret ?? json?.code;
    if (!result.ok || (code !== undefined && String(code) !== "0")) {
      throw new ProviderError(stage, result.status, safeProviderCode(code));
    }
    const data = json?.data ?? json;
    if (!object(data)) throw new ProviderError(stage, 502, "INVALID_RESPONSE");
    return data;
  }

  async function file() {
    originalPromise ??= (async () => {
      const data = await request("file", "/openapi/drive/v2/util/converter", { query: { type: "2", value: SHARE_ID } });
      if (typeof data.fileID !== "string" || !filePattern.test(data.fileID)) {
        throw new ProviderError("file", 502, "INVALID_FILE_ID");
      }
      confirmed.add(data.fileID);
      return data.fileID;
    })();
    return originalPromise;
  }

  async function metadata(fileId) {
    approved(fileId, "metadata");
    const data = await request("metadata", `/openapi/spreadsheet/v3/files/${encodeURIComponent(fileId)}`, { query: { concise: "0" } });
    if (!Array.isArray(data.properties)) throw new ProviderError("metadata", 502, "INVALID_METADATA");
    const seen = new Set();
    for (const item of data.properties) {
      if (!object(item) || typeof item.sheetId !== "string" || !sheetPattern.test(item.sheetId)
        || seen.has(item.sheetId) || typeof item.title !== "string"
        || ![item.rowCount, item.columnCount, item.rowTotal, item.columnTotal].every(integer)
        || item.rowCount > item.rowTotal || item.columnCount > item.columnTotal
        || !Number.isSafeInteger(item.rowCount * item.columnCount)) {
        throw new ProviderError("metadata", 502, "INVALID_METADATA");
      }
      seen.add(item.sheetId);
    }
    return data;
  }

  async function readSheet(fileId, sheetId) {
    approved(fileId, "readSheet");
    sheet(sheetId, "readSheet");
    const info = await metadata(fileId);
    const properties = info.properties.find((item) => item.sheetId === sheetId);
    if (!properties) throw new ProviderError("readSheet", 404, "SHEET_NOT_FOUND");
    const { rowCount, columnCount } = properties;
    const grids = [];
    if (rowCount && columnCount) {
      for (let startColumn = 0; startColumn < columnCount; startColumn += MAX_COLUMNS) {
        const width = Math.min(MAX_COLUMNS, columnCount - startColumn);
        const height = Math.min(MAX_ROWS, Math.floor(MAX_CELLS / width));
        for (let startRow = 0; startRow < rowCount; startRow += height) {
          const rows = Math.min(height, rowCount - startRow);
          const range = `${columnName(startColumn)}${startRow + 1}:${columnName(startColumn + width - 1)}${startRow + rows}`;
          const data = await request("readSheet", `/openapi/spreadsheet/v3/files/${encodeURIComponent(fileId)}/${encodeURIComponent(sheetId)}/${range}`);
          const chunk = Array.isArray(data.gridData) ? data.gridData : [data.gridData];
          if (!chunk.length || chunk.some((grid) => !object(grid) || !integer(grid.startRow)
            || !integer(grid.startColumn) || !Array.isArray(grid.rows))) {
            throw new ProviderError("readSheet", 502, "INVALID_GRID_RESPONSE");
          }
          // Raw CellData, links, styles, and unknown fields are kept without projection.
          grids.push(...chunk);
        }
      }
    }
    return { fileId, sheetId, metadata: properties, rowCount, columnCount, grids };
  }

  async function copyOriginal(title) {
    validTitle(title, "copyOriginal");
    const original = await file();
    const data = await request("copyOriginal", `/openapi/drive/v2/files/${encodeURIComponent(original)}/copy`, {
      write: true, form: { title },
    });
    let url;
    try { url = new URL(data.url); } catch { throw new ProviderError("copyOriginal", 502, "INVALID_COPY_RESPONSE"); }
    if (typeof data.ID !== "string" || !filePattern.test(data.ID) || data.ID === original
      || url.origin !== ORIGIN || !/^\/(sheet|doc|slide|form|smartsheet)\//.test(url.pathname)) {
      throw new ProviderError("copyOriginal", 502, "INVALID_COPY_RESPONSE");
    }
    confirmed.add(data.ID);
    return { ID: data.ID, url: data.url };
  }

  async function update(fileId, operation, stage) {
    approved(fileId, stage);
    const data = await request(stage, `/openapi/spreadsheet/v3/files/${encodeURIComponent(fileId)}/batchUpdate`, {
      write: true, body: { requests: [operation] },
    });
    if (!Array.isArray(data.responses) || data.responses.length !== 1 || !object(data.responses[0])) {
      throw new ProviderError(stage, 502, "INVALID_UPDATE_RESPONSE");
    }
    return data.responses[0];
  }

  async function addSheet(fileId, title, rowCount = 600, columnCount = 12) {
    approved(fileId, "addSheet");
    validTitle(title, "addSheet", 31);
    if (!integer(rowCount) || rowCount < 1 || rowCount > 10000 || !integer(columnCount)
      || columnCount < 1 || columnCount > MAX_COLUMNS || rowCount * columnCount > MAX_CELLS) invalid("addSheet");
    const result = await update(fileId, { addSheetRequest: { title, rowCount, columnCount } }, "addSheet");
    const properties = result.addSheetResponse?.properties;
    if (!object(properties) || typeof properties.sheetId !== "string" || !sheetPattern.test(properties.sheetId)
      || properties.title !== title || properties.rowTotal !== rowCount || properties.columnTotal !== columnCount) {
      throw new ProviderError("addSheet", 502, "INVALID_ADD_RESPONSE");
    }
    return properties;
  }

  async function writeGrid(fileId, sheetId, gridData) {
    approved(fileId, "writeGrid");
    sheet(sheetId, "writeGrid");
    const expectedCells = validateGrid(gridData, "writeGrid");
    const result = await update(fileId, { updateRangeRequest: { sheetId, gridData } }, "writeGrid");
    const updatedCells = result.updateRangeResponse?.updatedCells;
    if (!Number.isSafeInteger(updatedCells) || updatedCells !== expectedCells) {
      throw new ProviderError("writeGrid", 502, "CELL_COUNT_MISMATCH");
    }
    return { updatedCells, expectedCells };
  }

  return { file, metadata, readSheet, copyOriginal, addSheet, writeGrid };
}
