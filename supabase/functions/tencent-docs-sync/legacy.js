// Pure Tencent Docs sync planner. No network, file access, or mutations.
// The provider adapter must supply decoded typed fields AND every original cell.
const TARGETS = { BB08J2: "1.16.1", BB08J3: "1.15.2" };
const clone = (value) => structuredClone(value);
const id = (value) => String(value ?? "");
const trim = (value) => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

export function rowSignature(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(rowSignature).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${rowSignature(value[key])}`).join(",")}}`;
}

export function parseTime(value, milliseconds) {
  const raw = trim(value);
  const match = /^(\d+):([0-5]\d)(?::([0-5]\d))?(?:\.(\d{1,3}))?$/.exec(raw);
  if (!match) return null;
  const dedicated = trim(milliseconds);
  if (dedicated && !/^\d{1,3}$/.test(dedicated)) return null;
  const fraction = match[4] === undefined ? null : Number(match[4].padEnd(3, "0"));
  const ms = dedicated ? Number(dedicated) : fraction ?? 0;
  if (fraction !== null && dedicated && fraction !== ms) return null;
  const seconds = match[3] === undefined
    ? Number(match[1]) * 60 + Number(match[2])
    : Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  const total = seconds * 1000 + ms;
  if (!Number.isSafeInteger(total) || total < 0) return null;
  return { total, seconds, ms, precise: Boolean(dedicated) || fraction !== null };
}

export function parseDate(value) {
  const raw = trim(value);
  if (!raw) return { key: "", display: "" };
  const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(raw);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { key: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`, display: `${year}/${month}/${day}` };
}

function video(value, explicitBvid = "") {
  const object = value && typeof value === "object" ? value : { text: value, url: value };
  const text = trim(object.text);
  let url = trim(object.url);
  const bvid = trim(explicitBvid || object.bvid);
  const inValue = [...`${url} ${text}`.matchAll(/\bBV[A-Za-z0-9]{10}\b/g)].map((match) => match[0]);
  const identifiers = [...new Set([bvid, ...inValue].filter(Boolean))];
  if (identifiers.length > 1 || identifiers.some((identifier) => !/^BV[A-Za-z0-9]{10}$/.test(identifier))) return null;
  const resolved = identifiers[0] || "";
  if (resolved) return { bvid: resolved, url: `https://www.bilibili.com/video/${resolved}`, text: text || resolved };
  if (!url || /^(?:novideo|no\s*video(?:\s*-\s*\d+)?|无视频|视频已删除)$/i.test(url)) return { bvid: "", url: "", text: "" };
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return null;
    url = parsed.href;
  } catch { return null; }
  return { bvid: "", url, text: text || url };
}

function remarkMilliseconds(remarks) {
  const values = [...trim(remarks).matchAll(/(?:^|[\s;；,，])([0-9]{1,3})\s*ms(?=$|[\s;；,，])/gi)].map((match) => Number(match[1]));
  const unique = [...new Set(values)];
  return unique.length > 1 ? { ambiguous: true } : { value: unique.length ? String(unique[0]) : "" };
}

function withMilliseconds(remarks, ms) {
  const text = trim(remarks).replace(/(?:^|[\s;；,，])([0-9]{1,3})\s*ms(?=$|[\s;；,，])/gi, " ").trim();
  return [ms ? `${String(ms).padStart(3, "0")}ms` : "", text].filter(Boolean).join("；");
}

function displayTime(time) {
  const seconds = time.seconds % 60;
  const minutes = Math.floor(time.seconds / 60);
  if (minutes >= 60) return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function sourceRun(run) {
  const normalized = { ...run, userId: id(run.userid ?? run.userId), runId: id(run.run_id ?? run.id ?? run.runId) };
  normalized.time = parseTime(run.igt);
  normalized.dateValue = parseDate(run.date);
  // bvid is a cached helper column and may be stale after a URL correction.
  // The current videolink is the authoritative link for matching.
  normalized.videoValue = video(run.videolink ?? run.video ?? "");
  if (!normalized.userId || !normalized.runId || !normalized.time || !normalized.dateValue || !normalized.videoValue) return null;
  if (run.igt_ms != null && Number(run.igt_ms) !== normalized.time.total) return null;
  return normalized;
}

function decodedRow(row, layout) {
  if (row.readable !== true || row.raw === undefined || row.editable === false || !Number.isSafeInteger(row.rowIndex) || row.rowIndex < 1) return null;
  const fields = row.fields;
  if (!fields || typeof fields !== "object") return null;
  for (const key of ["rank", "nickname", "time", "milliseconds", "route", "date", "seed", "remarks"]) {
    if (fields[key] != null && !["string", "number"].includes(typeof fields[key])) return null;
  }
  const remarkMs = remarkMilliseconds(fields.remarks);
  if (remarkMs.ambiguous) return null;
  const dedicatedMs = trim(fields.milliseconds);
  if (layout.milliseconds && dedicatedMs && remarkMs.value && Number(dedicatedMs) !== Number(remarkMs.value)) return null;
  const time = parseTime(fields.time, layout.milliseconds ? dedicatedMs || remarkMs.value : remarkMs.value);
  const date = parseDate(fields.date);
  const link = video(fields.video);
  if (!time || !date || !link || !trim(fields.nickname)) return null;
  return { ...row, fields: clone(fields), timeValue: time, dateValue: date, videoValue: link, signature: rowSignature(row.raw) };
}

function sameRunFields(row, run) {
  return (row.timeValue.precise ? row.timeValue.total === run.time.total : row.timeValue.seconds === run.time.seconds)
    && (!row.dateValue.key || row.dateValue.key === run.dateValue.key);
}

function renderedFields(run, layout, previous, binding, isNewRun) {
  const output = { rank: run.rank, nickname: trim(run.nickname), time: displayTime(run.time),
    video: run.videoValue, date: run.dateValue.display };
  if (layout.milliseconds) output.milliseconds = String(run.time.ms).padStart(3, "0");
  if (layout.seed) output.seed = trim(run.seed);
  if (layout.route) output.route = isNewRun ? trim(run.route) : trim(previous?.route);
  // Document notes may be hand-written. Preserve them for the same run. A new
  // PB never inherits the previous run's route, seed, or record-specific notes.
  let remarks = isNewRun ? trim(run.remarks) : trim(previous?.remarks);
  if (!isNewRun && binding?.sourceFields && trim(binding.sourceFields.remarks) === remarks) remarks = trim(run.remarks);
  output.remarks = layout.milliseconds ? remarks : withMilliseconds(remarks, run.time.ms);
  return output;
}

function comparable(field, value) {
  if (field === "video") {
    const result = video(value);
    return result ? `${result.bvid}|${result.url}` : "invalid";
  }
  if (field === "rank") return String(Number(value));
  if (field === "date") return parseDate(value)?.key ?? "invalid";
  if (field === "milliseconds") return String(Number(value || 0));
  return trim(value);
}

/**
 * input.source = one entry from docs_sync_source().sheets
 * input.document = {sheetId, rows:[{rowIndex,raw,fields,readable,isDataRow}],
 *   layout:{milliseconds:boolean,seed:boolean,route:boolean}, appendRowIndex}
 * input.bindings = [{userId,runId,rowIndex,rowSignature,sourceFields}]
 * input.complete must assert complete DB AND full document snapshots.
 * Logical cell changes are returned; the provider adapter maps fields to A1.
 */
export function planSheet(input) {
  const { source, document, bindings = [] } = input || {};
  const sheetId = source?.sheet_id;
  const conflicts = [];
  const warnings = [];
  const draftOperations = [];
  const nextBindings = [];
  const conflict = (code, details = {}) => conflicts.push({ code, sheetId, ...details });
  const finish = () => ({ sheetId, safeToWrite: !conflicts.length, conflicts, warnings,
    operations: conflicts.length ? [] : draftOperations, draftOperations, nextBindings,
    sourceFingerprint: rowSignature(source), documentFingerprint: rowSignature(document) });
  if (input?.complete !== true || !source || !document || !Array.isArray(source.snapshot) || !Array.isArray(source.runs)
    || !Array.isArray(source.users) || !Array.isArray(document.rows) || !Array.isArray(bindings)) {
    conflict("incomplete_snapshot"); return finish();
  }
  if (!TARGETS[sheetId] || TARGETS[sheetId] !== source.version || source.type !== "RSG" || document.sheetId !== sheetId) {
    conflict("wrong_sheet_or_group"); return finish();
  }
  const layout = document.layout;
  if (!layout || typeof layout.milliseconds !== "boolean" || typeof layout.seed !== "boolean" || typeof layout.route !== "boolean"
    || layout.milliseconds !== (sheetId === "BB08J2") || layout.route !== (sheetId === "BB08J3")) {
    conflict("unverified_layout"); return finish();
  }
  const rows = [];
  const seenRowIndexes = new Set();
  for (const rawRow of document.rows) {
    if (rawRow.isDataRow === false) continue;
    if (rawRow.isDataRow !== true) { conflict("unclassified_document_row", { rowIndex: rawRow.rowIndex }); continue; }
    const row = decodedRow(rawRow, layout);
    if (!row) { conflict("unreadable_or_invalid_row", { rowIndex: rawRow.rowIndex }); continue; }
    if (seenRowIndexes.has(row.rowIndex)) conflict("duplicate_row_coordinate", { rowIndex: row.rowIndex });
    seenRowIndexes.add(row.rowIndex); rows.push(row);
  }
  const history = [];
  for (const rawRun of source.runs) {
    if ((rawRun.status != null && rawRun.status !== "verified") || (rawRun.version != null && rawRun.version !== source.version)
      || (rawRun.type != null && rawRun.type !== source.type)) { conflict("wrong_history_group", { runId: id(rawRun.id ?? rawRun.run_id) }); continue; }
    const run = sourceRun(rawRun);
    if (!run) { conflict("invalid_history_run", { runId: id(rawRun.id ?? rawRun.run_id) }); continue; }
    history.push(run);
  }
  const usersById = new Map();
  const usersByName = new Map();
  for (const user of source.users) {
    const userId = id(user.id);
    if (!userId || usersById.has(userId)) { conflict("duplicate_or_invalid_user", { userId }); continue; }
    usersById.set(userId, user);
    const name = trim(user.nickname);
    usersByName.set(name, [...(usersByName.get(name) || []), userId]);
  }
  const bindByRow = new Map();
  const bindByUser = new Map();
  for (const binding of bindings) {
    const userId = id(binding.userId ?? binding.userid);
    const runId = id(binding.runId ?? binding.run_id);
    let row = rows.find((entry) => entry.rowIndex === binding.rowIndex && entry.signature === binding.rowSignature);
    if (!row) {
      const same = rows.filter((entry) => entry.signature === binding.rowSignature);
      if (same.length === 1) row = same[0];
    }
    if (!row || !userId || !runId || bindByUser.has(userId) || bindByRow.has(row.rowIndex)) {
      conflict("stale_or_duplicate_binding", { userId, rowIndex: binding.rowIndex }); continue;
    }
    const oldRun = history.find((run) => run.runId === runId && run.userId === userId);
    if (!oldRun) { conflict("binding_run_missing", { userId, runId }); continue; }
    bindByRow.set(row.rowIndex, { ...binding, userId, runId, row });
    bindByUser.set(userId, { ...binding, userId, runId, row });
  }
  const assigned = new Map();
  for (const row of rows) {
    const binding = bindByRow.get(row.rowIndex);
    let userId;
    let runId;
    if (binding) { userId = binding.userId; runId = binding.runId; }
    else {
      let candidates;
      if (row.videoValue.bvid) {
        const owners = new Set(history.filter((run) => run.videoValue.bvid === row.videoValue.bvid).map((run) => run.userId));
        if (owners.size > 1) { conflict("video_shared_by_multiple_players", { rowIndex: row.rowIndex, bvid: row.videoValue.bvid }); continue; }
        candidates = history.filter((run) => run.videoValue.bvid === row.videoValue.bvid && sameRunFields(row, run));
      } else if (row.videoValue.url) {
        candidates = history.filter((run) => run.videoValue.url === row.videoValue.url && sameRunFields(row, run));
      } else {
        const namedUsers = usersByName.get(trim(row.fields.nickname)) || [];
        candidates = namedUsers.length === 1 ? history.filter((run) => run.userId === namedUsers[0] && sameRunFields(row, run)) : [];
      }
      if (candidates.length !== 1) { conflict(candidates.length ? "ambiguous_legacy_row" : "unmatched_legacy_row", { rowIndex: row.rowIndex, candidateRunIds: candidates.map((run) => run.runId) }); continue; }
      ({ userId, runId } = candidates[0]);
    }
    if (assigned.has(userId)) { conflict("duplicate_player_rows", { userId, rowIndexes: [assigned.get(userId).row.rowIndex, row.rowIndex] }); continue; }
    assigned.set(userId, { row, runId, binding });
  }
  const sources = [];
  const sourceUsers = new Set();
  const sourceRanks = new Set();
  for (const rawRun of source.snapshot) {
    let run = sourceRun(rawRun);
    if (!run || !trim(run.nickname) || !usersById.has(run.userId) || !Number.isSafeInteger(run.rank) || run.rank < 1) {
      conflict("invalid_source_run", { runId: id(rawRun.run_id ?? rawRun.id) }); continue;
    }
    if (sourceUsers.has(run.userId) || sourceRanks.has(run.rank)) conflict("duplicate_source_player_or_rank", { userId: run.userId, rank: run.rank });
    sourceUsers.add(run.userId); sourceRanks.add(run.rank);
    if (rawRun.best_time_tie) {
      const existing = assigned.get(run.userId);
      const candidateIds = (rawRun.candidate_run_ids || []).map(id);
      const preferred = existing && candidateIds.includes(existing.runId) ? history.find((entry) => entry.runId === existing.runId && entry.userId === run.userId) : null;
      if (!preferred) { conflict("ambiguous_best_run", { userId: run.userId, candidateRunIds: candidateIds }); continue; }
      run = { ...preferred, rank: rawRun.rank, nickname: rawRun.nickname };
    }
    sources.push(run);
  }
  for (let rank = 1; rank <= source.snapshot.length; rank++) if (!sourceRanks.has(rank)) conflict("noncontiguous_source_ranks", { rank });
  for (const [userId, existing] of assigned) {
    if (!sourceUsers.has(userId)) conflict("document_player_missing_from_source", { userId, rowIndex: existing.row.rowIndex });
  }
  let appendRow = document.appendRowIndex;
  const maxRow = Math.max(0, ...document.rows.filter((row) => row.isDataRow).map((row) => Number(row.rowIndex) || 0));
  const appendCount = sources.filter((run) => !assigned.has(run.userId)).length;
  const needsAppend = appendCount > 0;
  if (needsAppend && (!Number.isSafeInteger(appendRow) || appendRow <= maxRow || document.appendRegionVerifiedEmpty !== true)) conflict("append_region_not_verified_empty");
  if (needsAppend && (!Number.isSafeInteger(document.rowCount) || appendRow + appendCount - 1 > document.rowCount)) conflict("append_exceeds_existing_capacity");
  for (const run of sources) {
    const existing = assigned.get(run.userId);
    const isNewRun = !existing || existing.runId !== run.runId;
    const fields = renderedFields(run, layout, existing?.row.fields, existing?.binding, isNewRun);
    const changes = {};
    for (const [field, value] of Object.entries(fields)) {
      if (!existing || comparable(field, existing.row.fields[field]) !== comparable(field, value)) changes[field] = value;
    }
    const targetRow = existing?.row.rowIndex ?? appendRow++;
    if (Object.keys(changes).length) draftOperations.push({ kind: existing ? "update" : "append", userId: run.userId, runId: run.runId,
      previousRunId: existing?.runId ?? null, rowIndex: targetRow, changes,
      precondition: existing ? { rowSignature: existing.row.signature, raw: clone(existing.row.raw) } : { empty: true },
      backup: existing ? { sheetId, rowIndex: targetRow, userId: run.userId, runId: existing.runId, raw: clone(existing.row.raw), fields: clone(existing.row.fields), reason: isNewRun ? "new_personal_best" : "source_update" } : null,
      newPersonalBest: Boolean(existing && isNewRun) });
    nextBindings.push({ userId: run.userId, runId: run.runId, rowIndex: targetRow,
      previousRowSignature: existing?.row.signature ?? null, sourceFields: fields });
    if (!isNewRun && trim(existing.row.fields.remarks) && trim(existing.row.fields.remarks) !== trim(run.remarks)) warnings.push({ code: "manual_remarks_preserved", sheetId, userId: run.userId, rowIndex: targetRow });
  }
  return finish();
}

export function planSync(input) {
  const plans = (input?.sheets || []).map((sheet) => planSheet({ ...sheet, complete: input.complete === true && sheet.complete !== false }));
  const safeToWrite = plans.length === 2 && new Set(plans.map((plan) => plan.sheetId)).size === 2 && plans.every((plan) => plan.safeToWrite);
  return { safeToWrite, plans, operations: safeToWrite ? plans.flatMap((plan) => plan.operations.map((operation) => ({ sheetId: plan.sheetId, ...operation }))) : [] };
}

export function decodeTencentCell(raw) {
  if (raw == null) return { kind: "blank", value: "" };
  if (typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid raw Tencent cell");
  const value = raw.cellValue;
  if (value == null) return { kind: "blank", value: "" };
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Tencent cellValue");
  const keys = Object.keys(value).filter((key) => value[key] !== undefined && value[key] !== null);
  if (keys.length !== 1) throw new Error("Ambiguous Tencent cellValue");
  const kind = keys[0];
  const content = value[kind];
  if (kind === "text" && typeof content === "string") return { kind, value: content };
  if (kind === "number" && typeof content === "number" && Number.isFinite(content)) return { kind, value: content };
  if (kind === "bool" && typeof content === "boolean") return { kind, value: content };
  if (kind === "link" && content && typeof content.url === "string" && typeof content.text === "string") {
    return { kind, value: { url: content.url, text: content.text, overwrite: content.overwrite } };
  }
  if (kind === "time" && content && ["year", "month", "day"].every((key) => Number.isInteger(content[key]))
    && ["hour", "minute", "second"].every((key) => content[key] == null || content[key] === 0)) {
    const parsed = parseDate(`${content.year}/${content.month}/${content.day}`);
    if (parsed) return { kind, value: parsed.display };
  }
  throw new Error(`Unsupported Tencent cellValue kind: ${kind}`);
}

const COLUMN_MAPS = {
  BB08J2: { rank: 1, nickname: 3, time: 4, milliseconds: 5, video: 6, seed: 7, date: 8, remarks: 10 },
  BB08J3: { rank: 1, nickname: 3, time: 4, route: 5, video: 6, date: 7, remarks: 9 },
};
const HEADER_MAPS = {
  BB08J2: { rank: "名次", nickname: "B站id", time: "用时(mm:ss)", milliseconds: "毫秒(ms)", video: "纪录视频", seed: "seed", date: "纪录日期", remarks: "备注" },
  BB08J3: { rank: "名次", nickname: "B站id", time: "用时(mm:ss)", route: "路线/打法", video: "纪录视频", date: "纪录日期", remarks: "备注" },
};

/** Decode a full captured sheet; never projects away original cells or formatting. */
export function adaptTencentSnapshot(snapshot) {
  const sheetId = snapshot?.sheetId;
  const columns = COLUMN_MAPS[sheetId];
  if (!columns || !snapshot.property || !Array.isArray(snapshot.chunks)) throw new Error("Unknown or incomplete Tencent sheet");
  const title = sheetId === "BB08J2" ? "1.16+RSG" : "1.13-1.15 RSG";
  if (snapshot.property.title !== title) throw new Error("Tencent sheet title mismatch");
  const height = snapshot.property.rowTotal ?? snapshot.property.rowCount;
  const width = snapshot.property.columnTotal ?? snapshot.property.columnCount;
  if (!Number.isInteger(height) || !Number.isInteger(width) || height < 3 || width <= Math.max(...Object.values(columns))) throw new Error("Invalid Tencent sheet dimensions");
  const rawByRow = new Map();
  for (const chunk of snapshot.chunks) {
    const grids = Array.isArray(chunk.gridData) ? chunk.gridData : [chunk.gridData];
    for (const grid of grids) {
      if (!grid || (grid.startColumn ?? 0) !== 0 || !Array.isArray(grid.rows) || !Number.isInteger(grid.startRow ?? 0)) throw new Error("Partial column captures are unsafe");
      grid.rows.forEach((raw, offset) => {
        const rowIndex = (grid.startRow || 0) + offset + 1;
        if (rawByRow.has(rowIndex) || !Array.isArray(raw?.values) || raw.values.length < width) throw new Error("Incomplete or overlapping Tencent rows");
        rawByRow.set(rowIndex, clone(raw));
      });
    }
  }
  if (rawByRow.size !== height || Array.from({ length: height }, (_, index) => index + 1).some((rowIndex) => !rawByRow.has(rowIndex))) throw new Error("Full Tencent sheet capture required");
  const headers = rawByRow.get(2).values;
  for (const [field, expected] of Object.entries(HEADER_MAPS[sheetId])) {
    if (decodeTencentCell(headers[columns[field]]).value !== expected) throw new Error(`Tencent header mismatch: ${field}`);
  }
  const rows = [];
  let finalDataRow = 2;
  for (let rowIndex = 1; rowIndex <= height; rowIndex++) {
    const raw = rawByRow.get(rowIndex);
    if (rowIndex <= 2) { rows.push({ rowIndex, raw, isDataRow: false, readable: true }); continue; }
    let rank;
    let nickname;
    try {
      rank = decodeTencentCell(raw.values[columns.rank]);
      nickname = decodeTencentCell(raw.values[columns.nickname]);
    } catch {
      rows.push({ rowIndex, raw, isDataRow: true, readable: false }); finalDataRow = rowIndex; continue;
    }
    if (trim(rank.value) === "" && trim(nickname.value) === "") {
      // Keep complete raw footer/blank rows. A cell with content in another
      // column is not considered available for append.
      rows.push({ rowIndex, raw, isDataRow: false, readable: true }); continue;
    }
    const fields = {};
    let readable = true;
    const errors = [];
    for (const [field, column] of Object.entries(columns)) {
      try {
        const cell = decodeTencentCell(raw.values[column]);
        if (field === "time" && cell.kind === "number") {
          const seconds = cell.value * 86400;
          const rounded = Math.round(seconds);
          if (seconds < 0 || !Number.isSafeInteger(rounded) || Math.abs(seconds - rounded) > 0.02) throw new Error("Time number is not a whole second Excel day value");
          fields.time = displayTime({ seconds: rounded });
        } else if (field === "video") {
          if (cell.kind === "link") fields.video = cell.value;
          else if (["text", "blank"].includes(cell.kind)) fields.video = { text: cell.value, url: cell.value };
          else throw new Error("Unexpected video type");
        } else if (field === "date") {
          if (!["text", "time", "blank"].includes(cell.kind)) throw new Error("Unexpected date type");
          fields.date = cell.value;
        } else {
          if (!["text", "number", "blank"].includes(cell.kind)) throw new Error(`Unexpected ${field} type`);
          if (field === "seed" && cell.kind === "number" && !Number.isSafeInteger(cell.value)) throw new Error("Unsafe numeric seed");
          fields[field] = cell.value;
        }
      } catch (error) { readable = false; errors.push({ field, reason: error.message }); }
    }
    if (!/^\d+$/.test(trim(fields.rank)) || Number(fields.rank) < 1) readable = false;
    rows.push({ rowIndex, raw, fields, readable, isDataRow: true, decodingIssues: errors });
    finalDataRow = rowIndex;
  }
  const tailRows = rows.filter((row) => row.rowIndex > finalDataRow);
  const tailEmpty = tailRows.every((row) => row.raw.values.every((rawCell) => {
    try { const cell = decodeTencentCell(rawCell); return cell.kind === "blank" || cell.kind === "text" && !cell.value; } catch { return false; }
  }));
  return { sheetId, layout: { milliseconds: sheetId === "BB08J2", seed: sheetId === "BB08J2", route: sheetId === "BB08J3" },
    columns: clone(columns), rows, appendRowIndex: tailEmpty ? finalDataRow + 1 : null, appendRegionVerifiedEmpty: tailEmpty,
    rowCount: height, columnCount: width, rawProperty: clone(snapshot.property) };
}

/**
 * Extract notes only for the exact historic run that owns them. This never
 * modifies the document and never transfers old-run notes to a player's PB.
 * Missing millisecond precision and all no-video matches remain candidates.
 */
export function extractLegacyAnnotations(rawSnapshot, source) {
  const sourceSheets = Array.isArray(source?.sheets) ? source.sheets : Array.isArray(source) ? source : [];
  const snapshots = Array.isArray(rawSnapshot?.snapshots) ? rawSnapshot.snapshots : Array.isArray(rawSnapshot) ? rawSnapshot : [];
  const annotations = [];
  const candidates = [];
  const conflicts = [];
  const warnings = [];
  const stats = [];
  const byRunId = {};
  for (const snapshot of snapshots) {
    const sheetId = snapshot.sheetId;
    const sheetSource = sourceSheets.find((sheet) => sheet.sheet_id === sheetId);
    const counters = { sheetId, totalRows: 0, dataRows: 0, invalidRows: 0, matched: 0, candidates: 0, unmatched: 0,
      noVideoRows: 0, missingDates: 0, missingMilliseconds: 0, staleBvids: 0, duplicateNames: [] };
    stats.push(counters);
    let document;
    try { document = adaptTencentSnapshot(snapshot); }
    catch (error) { conflicts.push({ code: "invalid_document_capture", sheetId, reason: error.message }); continue; }
    counters.totalRows = document.rows.length;
    if (!sheetSource || !Array.isArray(sheetSource.runs) || !Array.isArray(sheetSource.users) || sheetSource.version !== TARGETS[sheetId] || sheetSource.type !== "RSG") {
      conflicts.push({ code: "missing_or_wrong_source_sheet", sheetId }); continue;
    }
    const history = [];
    for (const rawRun of sheetSource.runs) {
      if ((rawRun.status != null && rawRun.status !== "verified") || (rawRun.version != null && rawRun.version !== sheetSource.version)
        || (rawRun.type != null && rawRun.type !== "RSG")) {
        conflicts.push({ code: "wrong_history_group", sheetId, runId: id(rawRun.run_id ?? rawRun.id) }); continue;
      }
      const run = sourceRun(rawRun);
      if (!run) { conflicts.push({ code: "invalid_history_run", sheetId, runId: id(rawRun.run_id ?? rawRun.id) }); continue; }
      history.push(run);
      if (rawRun.bvid && run.videoValue.bvid !== rawRun.bvid) {
        counters.staleBvids++;
        warnings.push({ code: "cached_bvid_ignored", sheetId, runId: run.runId, currentBvid: run.videoValue.bvid, cachedBvid: rawRun.bvid });
      }
    }
    const names = new Map();
    const usersByName = new Map();
    for (const user of sheetSource.users) usersByName.set(trim(user.nickname), [...(usersByName.get(trim(user.nickname)) || []), id(user.id)]);
    for (const rawRow of document.rows.filter((row) => row.isDataRow)) {
      counters.dataRows++;
      const row = decodedRow(rawRow, document.layout);
      if (!row) { counters.invalidRows++; conflicts.push({ code: "invalid_legacy_row", sheetId, rowIndex: rawRow.rowIndex, fields: rawRow.fields }); continue; }
      const name = trim(row.fields.nickname);
      names.set(name, [...(names.get(name) || []), row.rowIndex]);
      if (!row.dateValue.key) counters.missingDates++;
      if (!row.timeValue.precise) counters.missingMilliseconds++;
      const hasVideo = Boolean(row.videoValue.bvid || row.videoValue.url);
      if (!hasVideo) counters.noVideoRows++;
      let matches;
      if (row.videoValue.bvid) matches = history.filter((run) => run.videoValue.bvid === row.videoValue.bvid);
      else if (row.videoValue.url) matches = history.filter((run) => run.videoValue.url === row.videoValue.url);
      else {
        const ids = usersByName.get(name) || [];
        matches = ids.length === 1 ? history.filter((run) => run.userId === ids[0]) : [];
      }
      matches = matches.filter((run) => run.time.total === row.timeValue.total && run.dateValue.key === row.dateValue.key);
      if (matches.length !== 1) {
        if (matches.length) conflicts.push({ code: "ambiguous_annotation_run", sheetId, rowIndex: row.rowIndex, runIds: matches.map((run) => run.runId) });
        else { counters.unmatched++; warnings.push({ code: "unmatched_annotation_row", sheetId, rowIndex: row.rowIndex, bvid: row.videoValue.bvid, time: row.timeValue.total, date: row.dateValue.key }); }
        continue;
      }
      const run = matches[0];
      const annotation = { sheetId, rowIndex: row.rowIndex, runId: run.runId, userId: run.userId,
        originalRemarks: trim(row.fields.remarks), route: trim(row.fields.route), originalRow: clone(row.raw), originalFields: clone(row.fields),
        rowSignature: row.signature, evidence: { bvid: row.videoValue.bvid, videoUrl: row.videoValue.url, igtMs: row.timeValue.total, date: row.dateValue.key,
          preciseMilliseconds: row.timeValue.precise } };
      if (!hasVideo || !row.timeValue.precise) {
        counters.candidates++;
        candidates.push({ ...annotation, reasons: [...(!hasVideo ? ["no_video_requires_confirmation"] : []), ...(!row.timeValue.precise ? ["missing_millisecond_precision"] : [])] });
        continue;
      }
      if (byRunId[run.runId]) {
        const previous = byRunId[run.runId];
        if (previous !== "conflict") {
          const position = annotations.findIndex((entry) => entry.runId === run.runId);
          if (position >= 0) annotations.splice(position, 1);
          const previousCounter = stats.find((entry) => entry.sheetId === previous.sheetId);
          if (previousCounter) previousCounter.matched--;
        }
        byRunId[run.runId] = "conflict";
        conflicts.push({ code: "multiple_legacy_rows_for_run", sheetId, runId: run.runId, rowIndex: row.rowIndex });
        continue;
      }
      annotations.push(annotation); byRunId[run.runId] = annotation; counters.matched++;
    }
    counters.duplicateNames = [...names.entries()].filter(([, indexes]) => indexes.length > 1).map(([nickname, rowIndexes]) => ({ nickname, rowIndexes }));
  }
  for (const [runId, entry] of Object.entries(byRunId)) if (entry === "conflict") delete byRunId[runId];
  return { readOnly: true, annotations, byRunId, candidates, conflicts, warnings, stats };
}
