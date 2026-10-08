import { createProvider, ProviderError } from "./provider.js";
import { extractLegacyAnnotations } from "./legacy.js";

const GROUPS = [
  { key: "BB08J2", title: "网站同步·1.16+RSG" },
  { key: "BB08J3", title: "网站同步·1.13-1.15 RSG" },
];
const HEADERS = ["名次", "B站id", "用时(mm:ss.mmm)", "纪录视频", "seed", "纪录日期", "网站备注", "原文档备注", "原文档路线/打法"];
const COLUMNS = HEADERS.length;
const CAPACITY = 1000;
const forbiddenSheets = new Set(GROUPS.map((group) => group.key));
class SyncError extends Error {
  constructor(code, status = 409) { super(code); this.code = code; this.status = status; }
}
function reply(body, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
function serviceKey(env) {
  try {
    const value = JSON.parse(env.SUPABASE_SECRET_KEYS || "{}").default;
    const resolved = typeof value === "string" ? env[value] || value : "";
    if (resolved.startsWith("sb_secret_")) return resolved;
  } catch { /* Legacy runtime fallback. */ }
  return env.SUPABASE_SERVICE_ROLE_KEY || "";
}
function safeCode(error) {
  if (error instanceof SyncError) return error.code;
  if (error instanceof ProviderError) return "tencent_" + error.stage + "_" + String(error.code);
  return "internal_failure";
}
function scalar(cell) {
  const value = cell?.cellValue;
  if (!value || (value.text === "" && Object.keys(value).length === 1)) return null;
  if (typeof value.text === "string") return { text: value.text };
  if (typeof value.number === "number") return { number: value.number };
  if (value.link) return { link: { url: value.link.url, text: value.link.text } };
  if (value.time) return { time: value.time };
  return value;
}
function matrix(baseline) {
  const rows = [];
  for (const grid of baseline.gridData || []) {
    for (const [r, row] of (grid.rows || []).entries()) {
      const rowIndex = (grid.startRow || 0) + r;
      rows[rowIndex] ||= [];
      for (const [c, cell] of (row.values || []).entries()) rows[rowIndex][(grid.startColumn || 0) + c] = scalar(cell);
    }
  }
  for (let r = 0; r < rows.length; r++) {
    rows[r] = Array.from({ length: Math.max(COLUMNS, rows[r]?.length || 0) }, (_, c) => rows[r]?.[c] ?? null);
    while (rows[r].length > COLUMNS && rows[r].at(-1) === null) rows[r].pop();
  }
  while (rows.length && rows.at(-1).every((cell) => cell === null)) rows.pop();
  return rows;
}
const sameContent = (left, right) => JSON.stringify(matrix(left)) === JSON.stringify(matrix(right));
const baselineOf = (sheet) => ({ gridData: sheet.grids, rowCount: sheet.rowCount, colCount: Math.max(1, sheet.columnCount), captureTime: new Date().toISOString(), metadata: sheet.metadata });
function plannedBaseline(rendered) {
  // A formatted empty tail can make all 1000 rows "used" in Tencent metadata.
  // Recovery compares values only; storing repeated cell styles in the preparation
  // intent would exceed the mapping limit. Raw read snapshots keep their formats.
  const grid = { ...rendered.grid, rows: rendered.grid.rows.map((row) => ({
    values: row.values.map((cell) => ({ cellValue: cell.cellValue })),
  })) };
  return { gridData: [grid], rowCount: grid.rows.length, colCount: COLUMNS, captureTime: new Date().toISOString() };
}
function textCell(value, bold = false, title = false) {
  return { cellValue: { text: String(value ?? "") }, cellFormat: { textFormat: {
    font: title ? "微软雅黑" : "Calibri", fontSize: title ? 16 : 14,
    bold, italic: false, strikethrough: false, underline: false,
    color: { red: 0, green: 0, blue: 0, alpha: 255 },
  } } };
}
function sourceSignature(run) {
  return JSON.stringify([run.userid, run.igt, run.date, run.videolink]);
}
function chooseSnapshot(source, mapping) {
  const bindings = mapping.managed_rows || [];
  return source.snapshot.map((run) => {
    if (!run.best_time_tie) return run;
    const old = bindings.find((row) => row.userid === run.userid);
    if (!old || !run.candidate_run_ids.includes(old.run_id)) throw new SyncError("ambiguous_best_time_" + run.userid);
    const selected = source.runs.find((item) => item.run_id === old.run_id);
    if (!selected) throw new SyncError("missing_bound_best_run");
    return { ...selected, rank: run.rank };
  });
}
export function render(source, mapping, minimumRows = 0) {
  const group = GROUPS.find((item) => item.key === source.sheet_id);
  if (!group) throw new SyncError("unsupported_group");
  const snapshot = chooseSnapshot(source, mapping);
  if (snapshot.length + 2 > CAPACITY || snapshot.some((run) => !Number.isSafeInteger(run.userid) || !Number.isSafeInteger(run.run_id))) {
    throw new SyncError("capacity_or_identifier_limit");
  }
  const rows = [
    { values: Array.from({ length: COLUMNS }, (_, col) => textCell(col === 0 ? group.title + "（每位玩家仅展示已审核最好成绩）" : "", col === 0, col === 0)) },
    { values: HEADERS.map((title) => textCell(title, true)) },
  ];
  const managed = [];
  for (const run of snapshot) {
    if (typeof run.igt !== "string" || !/^[0-9]{1,6}:[0-5][0-9](\.[0-9]{1,3})?$/.test(run.igt)) {
      throw new SyncError("invalid_source_time_" + run.run_id);
    }
    const annotation = mapping.annotations?.[String(run.run_id)];
    const notes = annotation?.sourceSignature === sourceSignature(run) ? annotation : null;
    const values = [run.rank, run.nickname, run.igt, "", run.seed, run.date, run.remarks, notes?.originalRemarks || "", notes?.route || ""].map((value) => textCell(value));
    values[0] = { ...values[0], cellValue: { number: run.rank } };
    if (typeof run.videolink === "string" && /^https:\/\//.test(run.videolink)) {
      let video;
      try { video = new URL(run.videolink); } catch { throw new SyncError("invalid_video_url"); }
      if (video.username || video.password) throw new SyncError("invalid_video_url");
      values[3] = { ...values[3], cellValue: { link: { url: video.href, text: "Video Link", overwrite: true } } };
      values[3].cellFormat.textFormat.underline = true;
      values[3].cellFormat.textFormat.color = { red: 23, green: 92, blue: 235, alpha: 255 };
    } else if (run.videolink && !/^No Video/i.test(run.videolink)) {
      values[3] = textCell(run.videolink);
    }
    managed.push({ rowIndex: rows.length, userid: run.userid, run_id: run.run_id });
    rows.push({ values });
  }
  const usedRows = rows.length;
  while (rows.length < Math.max(usedRows, minimumRows)) rows.push({ values: Array.from({ length: COLUMNS }, () => textCell("")) });
  if (rows.length > CAPACITY) throw new SyncError("capacity_limit");
  return { grid: { startRow: 0, startColumn: 0, rows }, mapping: { ...mapping, managed_rows: managed, prepared: true }, usedRows, count: snapshot.length };
}

export function createHandler(env, { fetcher = fetch, providerFactory = createProvider } = {}) {
  const url = (env.SUPABASE_URL || "").replace(/\/$/, "");
  const key = serviceKey(env);
  const configured = Boolean(key && url.startsWith("https://") && env.TENCENT_DOCS_ACCESS_TOKEN && env.TENCENT_DOCS_OPEN_ID);
  async function rpc(name, body = {}) {
    let result;
    try {
      result = await fetcher(url + "/rest/v1/rpc/" + name, {
        method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
        headers: { apikey: key, "Content-Type": "application/json", ...(key.startsWith("eyJ") ? { Authorization: "Bearer " + key } : {}) },
        body: JSON.stringify(body),
      });
      if (!result.ok) {
        // Reveal only fixed validation categories, never raw database messages or data.
        const error = await result.json().catch(() => ({}));
        const categories = new Map([
          ["Invalid or oversized document state", "document_size"],
          ["Managed row is outside captured document", "row_outside_baseline"],
          ["Invalid managed row: rowIndex is zero-based; userid/run_id must be positive integers", "invalid_binding"],
          ["Managed row, player and run bindings must be unique per sheet", "duplicate_binding"],
          ["baseline requires raw gridData array, integer rowCount/colCount and captureTime", "invalid_baseline"],
          ["Recover outstanding document write intent before reconfiguring", "outstanding_intent"],
        ]);
        throw new SyncError("storage_" + name + "_" + (categories.get(error.message) || "request_rejected"), 503);
      }
      return await result.json();
    } catch (error) {
      if (error instanceof SyncError) throw error;
      const category = ["TimeoutError", "AbortError", "TypeError", "SyntaxError"].includes(error?.name) ? error.name : "unknown";
      throw new SyncError("storage_" + name + "_" + category, 503);
    }
  }
  function checkedTarget(mapping, metadata, group) {
    const id = mapping.target_sheet_id;
    const property = metadata.properties.find((item) => item.sheetId === id);
    if (!id || forbiddenSheets.has(id) || mapping.mode !== "managed_copy" || property?.title !== group.title) throw new SyncError("unsafe_target");
    return id;
  }
  async function backup(provider) {
    const state = await rpc("docs_sync_state");
    if (state.enabled) throw new SyncError("pause_before_prepare");
    const source = await rpc("docs_sync_source");
    if (source.sheets.every((item) => item.mapping?.backup?.snapshotSaved)) {
      return { backup: source.sheets[0].mapping.backup, alreadyPrepared: true };
    }
    if (source.sheets.some((item) => item.mapping?.backup?.snapshotSaved)) throw new SyncError("partial_backup_review_required");
    const fileId = await provider.file();
    const originals = [];
    for (const group of GROUPS) originals.push(await provider.readSheet(fileId, group.key));
    // The actual copy API returned 10007 (insufficient permission). Do not retry
    // through another folder or reconstruct a clone. Original pages stay untouched;
    // new managed pages are generated from the website's verified leaderboard.
    const copy = { snapshotSaved: true, nativeCopy: false, copyCode: "10007", sourceFileId: fileId,
      protection: "untouched_original_pages_and_private_read_snapshot" };
    for (const original of originals) {
      await rpc("docs_sync_configure", { p_sheet_id: original.sheetId,
        p_mapping: { schemaVersion: 1, mode: "managed_copy", columns: Object.fromEntries(HEADERS.map((name, index) => [name, index])), managed_rows: [], backup: copy,
          original: { sheetId: original.sheetId, property: original.metadata } },
        p_baseline: baselineOf(original) });
    }
    return { backup: copy, originalRows: originals.map((sheet) => ({ sheetId: sheet.sheetId, rows: sheet.rowCount })) };
  }
  async function prepare(provider) {
    if ((await rpc("docs_sync_state")).enabled) throw new SyncError("pause_before_prepare");
    const source = await rpc("docs_sync_source");
    const fileId = await provider.file();
    if (source.sheets.some((item) => !item.mapping?.backup?.snapshotSaved || !item.mapping?.original)) throw new SyncError("backup_required");
    const originals = [];
    for (const group of GROUPS) {
      const original = await provider.readSheet(fileId, group.key);
      originals.push({ sheetId: group.key, property: original.metadata, chunks: [{ gridData: original.grids }] });
    }
    const raw = { snapshots: originals };
    const extracted = extractLegacyAnnotations(raw, source);
    const annotations = {};
    for (const [runId, annotation] of Object.entries(extracted.byRunId)) {
      const run = source.sheets.flatMap((item) => item.runs).find((item) => String(item.run_id) === runId);
      if (run) annotations[runId] = { originalRemarks: annotation.originalRemarks, route: annotation.route, sourceSignature: sourceSignature(run) };
    }
    const prepared = [];
    for (const group of GROUPS) {
      const sheetSource = source.sheets.find((item) => item.sheet_id === group.key);
      let mapping = { ...sheetSource.mapping, annotations };
      let metadata = await provider.metadata(fileId);
      let target = mapping.target_sheet_id;
      if (!target) {
        const matches = metadata.properties.filter((item) => item.title === group.title);
        if (matches.length) {
          if (!mapping.creation_planned || matches.length !== 1 || mapping.existing_sheet_ids.includes(matches[0].sheetId)) throw new SyncError("existing_unmanaged_title");
          target = matches[0].sheetId;
        } else {
          mapping = { ...mapping, creation_planned: true, existing_sheet_ids: metadata.properties.map((item) => item.sheetId) };
          await rpc("docs_sync_configure", { p_sheet_id: group.key, p_mapping: mapping, p_baseline: sheetSource.baseline });
          const created = await provider.addSheet(fileId, group.title, CAPACITY, COLUMNS);
          target = created.sheetId;
        }
        mapping.target_sheet_id = target;
        const blank = await provider.readSheet(fileId, target);
        await rpc("docs_sync_configure", { p_sheet_id: group.key, p_mapping: mapping, p_baseline: baselineOf(blank) });
        metadata = await provider.metadata(fileId);
      }
      checkedTarget(mapping, metadata, group);
      const current = await provider.readSheet(fileId, target);
      const before = baselineOf(current);
      if (mapping.preparation_intent) {
        if (sameContent(before, mapping.preparation_intent)) {
          mapping = { ...mapping.preparation_mapping, preparation_intent: null, preparation_mapping: null };
          await rpc("docs_sync_configure", { p_sheet_id: group.key, p_mapping: mapping, p_baseline: before });
          sheetSource.baseline = before;
        } else if (!sameContent(before, sheetSource.baseline)) throw new SyncError("preparation_write_conflict");
        else mapping = { ...mapping, preparation_intent: null, preparation_mapping: null };
      }
      if (mapping.prepared && !sameContent(before, sheetSource.baseline)) throw new SyncError("managed_page_changed");
      if (!mapping.prepared && matrix(before).length) throw new SyncError("unexpected_nonempty_new_page");
      const rendered = render(sheetSource, mapping, before.rowCount);
      const planned = plannedBaseline(rendered);
      // Initial preparation only touches the newly created page. Persist its intended
      // contents before sending the single idempotent rectangle write.
      await rpc("docs_sync_configure", { p_sheet_id: group.key,
        p_mapping: { ...mapping, preparation_intent: planned, preparation_mapping: rendered.mapping, prepared: false }, p_baseline: before });
      if (!sameContent(before, planned)) await provider.writeGrid(fileId, target, rendered.grid);
      const actual = await provider.readSheet(fileId, target);
      if (!sameContent(baselineOf(actual), planned)) throw new SyncError("write_readback_mismatch");
      await rpc("docs_sync_configure", { p_sheet_id: group.key, p_mapping: { ...rendered.mapping, preparation_intent: null, preparation_mapping: null }, p_baseline: baselineOf(actual) });
      prepared.push({ group: group.key, sheetId: target, title: group.title, players: rendered.count });
    }
    return { prepared, annotationStats: extracted.stats, annotationConflicts: extracted.conflicts.length, originalPagesChanged: false };
  }
  async function process(provider) {
    const claimed = await rpc("docs_sync_claim", { p_limit: 1, p_lease_seconds: 180 });
    const outcomes = [];
    if (!claimed.jobs.length) return { enabled: claimed.enabled, outcomes };
    const fileId = await provider.file();
    for (const job of claimed.jobs) {
      const leaseArgs = { p_sheet_id: job.sheet_id, p_lease_token: job.lease_token };
      const renew = async () => { if (!(await rpc("docs_sync_renew", { ...leaseArgs, p_lease_seconds: 180 })).ok) throw new SyncError("lease_lost"); };
      try {
        const group = GROUPS.find((item) => item.key === job.sheet_id);
        await renew();
        const metadata = await provider.metadata(fileId);
        const target = checkedTarget(job.mapping, metadata, group);
        if (!job.mapping.prepared) throw new SyncError("page_not_prepared");
        let actual = await provider.readSheet(fileId, target);
        let effectiveBaseline = job.baseline;
        let effectiveMapping = job.mapping;
        if (job.write_intent) {
          if (sameContent(baselineOf(actual), job.write_intent.after)) {
            effectiveBaseline = baselineOf(actual);
            effectiveMapping = job.write_intent.mapping;
          }
          else if (sameContent(baselineOf(actual), job.write_intent.before)) effectiveBaseline = job.write_intent.before;
          else throw new SyncError("pending_write_conflict");
        } else if (!sameContent(baselineOf(actual), effectiveBaseline)) throw new SyncError("managed_page_changed");
        if (actual.metadata.columnTotal < COLUMNS || actual.metadata.rowTotal < job.snapshot.length + 2) throw new SyncError("sheet_capacity_limit");
        const rendered = render(job.source, effectiveMapping, actual.rowCount);
        const planned = plannedBaseline(rendered);
        await renew();
        // Re-read the owned region immediately before writing. A manual value change
        // stops this run. Original sheets and all other pages are never write targets.
        const latest = await provider.readSheet(fileId, target);
        if (!sameContent(baselineOf(latest), baselineOf(actual))) throw new SyncError("concurrent_document_edit");
        const intent = { before: baselineOf(latest), after: planned, mapping: rendered.mapping, generation: job.generation };
        if (!await rpc("docs_sync_record_intent", { ...leaseArgs, p_intent: intent })) throw new SyncError("lease_lost");
        await renew();
        if (!sameContent(baselineOf(latest), planned)) await provider.writeGrid(fileId, target, rendered.grid);
        actual = await provider.readSheet(fileId, target);
        if (!sameContent(baselineOf(actual), planned)) throw new SyncError("write_readback_mismatch");
        if (!await rpc("docs_sync_finish", { ...leaseArgs, p_generation: job.generation, p_baseline: baselineOf(actual), p_mapping: rendered.mapping })) throw new SyncError("lease_lost_after_write");
        outcomes.push({ group: job.sheet_id, players: rendered.count, success: true });
      } catch (error) {
        const code = safeCode(error);
        await rpc("docs_sync_fail", { ...leaseArgs, p_error: code, p_retry_seconds: /changed|conflict|capacity|ambiguous/.test(code) ? 3600 : 60 });
        outcomes.push({ group: job.sheet_id, success: false, code });
      }
    }
    return { enabled: claimed.enabled, outcomes };
  }
  return async (request) => {
    try {
      const path = new URL(request.url).pathname.replace(/^\/(?:functions\/v1\/)?tencent-docs-sync(?=\/|$)/, "") || "/";
      if (path === "/status" && request.method === "GET") return reply({ service: "tencent-docs-sync", configured });
      const scope = ({ "/inspect": "inspect", "/backup": "prepare", "/prepare": "prepare", "/process": "process" })[path];
      if (!scope) return reply({ code: "not_found" }, 404);
      if (request.method !== "POST") return reply({ code: "post_required" }, 405);
      if (!configured) return reply({ code: "not_configured" }, 503);
      const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(request.headers.get("Authorization") || "");
      if (!match || !(await rpc("docs_sync_consume_nonce", { p_nonce: match[1], p_scope: scope })).valid) return reply({ code: "invalid_capability" }, 403);
      const provider = providerFactory(env, { fetcher });
      if (path === "/inspect") {
        const source = await rpc("docs_sync_source");
        const result = { state: await rpc("docs_sync_state"), source };
        if (new URL(request.url).searchParams.get("snapshot") === "1") {
          const fileId = await provider.file();
          const metadata = await provider.metadata(fileId);
          result.documentSheets = [];
          for (const group of GROUPS) {
            const mapping = source.sheets.find((item) => item.sheet_id === group.key).mapping;
            result.documentSheets.push(await provider.readSheet(fileId, group.key));
            result.documentSheets.push(await provider.readSheet(fileId, checkedTarget(mapping, metadata, group)));
          }
        }
        return reply(result);
      }
      if (path === "/backup") return reply(await backup(provider));
      if (path === "/prepare") return reply(await prepare(provider));
      return reply(await process(provider));
    } catch (error) { return reply({ code: safeCode(error) }, error instanceof SyncError ? error.status : 502); }
  };
}
