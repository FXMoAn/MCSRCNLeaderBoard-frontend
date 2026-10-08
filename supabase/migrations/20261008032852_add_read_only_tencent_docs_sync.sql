-- Draft: site -> Tencent Docs, two RSG sheets only. No cron job is installed here.
-- Apply as postgres after review. This adds no business rows and changes no existing RLS.
-- All new state is private. Public RPCs are executable only by service_role/postgres.
-- No triggers/functions are added to, removed from, or changed on business tables.
-- A private polling reconcile only SELECTs verified source data, then updates private state.
-- Reconcile/HTTP/queue failures cannot roll back a separate administrator business action.
-- Workers must renew before each bounded HTTP operation and stop immediately on lease loss.
-- Tencent has no database fencing token: never allow an HTTP request to outlive its lease.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS mcsrcn_docs_sync;
REVOKE ALL ON SCHEMA mcsrcn_docs_sync FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA mcsrcn_docs_sync TO service_role;

CREATE TABLE IF NOT EXISTS mcsrcn_docs_sync.settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false,
  last_dispatch_at timestamptz,
  last_request_id bigint,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO mcsrcn_docs_sync.settings(singleton) VALUES(true) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS mcsrcn_docs_sync.sheets (
  sheet_id text PRIMARY KEY CHECK (sheet_id IN ('BB08J2', 'BB08J3')),
  version text NOT NULL,
  type text NOT NULL CHECK (type = 'RSG'),
  generation bigint NOT NULL DEFAULT 1 CHECK (generation > 0),
  completed_generation bigint NOT NULL DEFAULT 0 CHECK (completed_generation >= 0),
  ready boolean NOT NULL DEFAULT false,
  mapping jsonb,
  baseline jsonb,
  write_intent jsonb,
  source_hash text,
  source_polled_at timestamptz,
  lease_token uuid,
  lease_until timestamptz,
  lease_generation bigint,
  lease_source jsonb,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  dirty_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_success_at timestamptz,
  last_error text,
  CHECK (completed_generation <= generation),
  CHECK ((sheet_id = 'BB08J2' AND version = '1.16.1') OR
         (sheet_id = 'BB08J3' AND version = '1.15.2')),
  CHECK ((lease_token IS NULL AND lease_until IS NULL AND lease_generation IS NULL)
      OR (lease_token IS NOT NULL AND lease_until IS NOT NULL AND lease_generation IS NOT NULL))
);
INSERT INTO mcsrcn_docs_sync.sheets(sheet_id, version, type)
VALUES ('BB08J2', '1.16.1', 'RSG'), ('BB08J3', '1.15.2', 'RSG')
ON CONFLICT DO NOTHING;
-- Also supports upgrading the earlier reviewed draft without losing queue state.
ALTER TABLE mcsrcn_docs_sync.sheets ADD COLUMN IF NOT EXISTS write_intent jsonb;
ALTER TABLE mcsrcn_docs_sync.sheets ADD COLUMN IF NOT EXISTS source_hash text;
ALTER TABLE mcsrcn_docs_sync.sheets ADD COLUMN IF NOT EXISTS source_polled_at timestamptz;

CREATE TABLE IF NOT EXISTS mcsrcn_docs_sync.document_snapshots (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sheet_id text NOT NULL REFERENCES mcsrcn_docs_sync.sheets(sheet_id),
  captured_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  event text NOT NULL CHECK (event IN ('configure', 'intent', 'finish')),
  generation bigint NOT NULL,
  old_baseline jsonb,
  old_mapping jsonb,
  new_baseline jsonb NOT NULL,
  new_mapping jsonb NOT NULL,
  source jsonb
);
CREATE INDEX IF NOT EXISTS docs_sync_snapshots_sheet_id_idx
ON mcsrcn_docs_sync.document_snapshots(sheet_id, id DESC);
ALTER TABLE mcsrcn_docs_sync.document_snapshots
  DROP CONSTRAINT IF EXISTS document_snapshots_event_check;
ALTER TABLE mcsrcn_docs_sync.document_snapshots
  ADD CONSTRAINT document_snapshots_event_check CHECK (event IN ('configure', 'intent', 'finish'));

CREATE TABLE IF NOT EXISTS mcsrcn_docs_sync.nonces (
  nonce_hash bytea PRIMARY KEY,
  scope text NOT NULL CHECK (scope IN ('inspect', 'prepare', 'process')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE mcsrcn_docs_sync.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcsrcn_docs_sync.sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcsrcn_docs_sync.document_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcsrcn_docs_sync.nonces ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA mcsrcn_docs_sync FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA mcsrcn_docs_sync FROM PUBLIC, anon, authenticated, service_role;

-- ACL is the primary boundary. This also checks the actual SET ROLE, not user metadata,
-- auth.uid() being null, or the SECURITY DEFINER current_user (which is the owner).
CREATE OR REPLACE FUNCTION mcsrcn_docs_sync.assert_service()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE requested_role text := coalesce(current_setting('role', true), 'none');
BEGIN
  IF requested_role = 'service_role'
     OR (session_user IN ('postgres', 'supabase_admin', 'service_role')
         AND requested_role IN ('none', 'postgres', 'supabase_admin', 'service_role')) THEN
    RETURN;
  END IF;
  RAISE EXCEPTION 'Service role required' USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION mcsrcn_docs_sync.igt_ms(p_igt text)
RETURNS bigint LANGUAGE sql IMMUTABLE STRICT SET search_path = '' AS $$
  SELECT CASE WHEN p_igt ~ '^[0-9]{1,6}:[0-5][0-9]([.][0-9]{1,3})?$'
    THEN split_part(p_igt, ':', 1)::bigint * 60000
       + split_part(split_part(p_igt, ':', 2), '.', 1)::bigint * 1000
       + coalesce(nullif(rpad(split_part(p_igt, '.', 2), 3, '0'), ''), '0')::bigint
    ELSE NULL END;
$$;

-- Selection is deliberately the existing get_leaderboard rule: ORDER BY r.igt TEXT.
-- Same-text ties remain explicitly marked. The worker must use an existing run binding
-- among candidate_run_ids, or block that player; it must not invent a different PB rule.
CREATE OR REPLACE FUNCTION mcsrcn_docs_sync.source_sheet(p_sheet_id text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  WITH cfg AS (
    SELECT sheet_id, version, type, ready, mapping, baseline, write_intent, source_hash,
           source_polled_at, generation, completed_generation
      FROM mcsrcn_docs_sync.sheets WHERE sheet_id = p_sheet_id
  ), all_runs AS (
    SELECT r.id AS run_id, r.id, r.userid, u.nickname, u.bili_id,
           r.igt, mcsrcn_docs_sync.igt_ms(r.igt) AS igt_ms,
           r.date, r.version, r.type, r.videolink, r.bvid, r.seed, r.remarks, r.subversion
      FROM public.runs r JOIN public.users u ON u.id = r.userid JOIN cfg c
        ON r.version = c.version AND r.type = c.type
     WHERE r.status = 'verified'
  ), ranked AS (
    SELECT a.*, row_number() OVER (PARTITION BY a.userid ORDER BY a.igt) AS player_rn
      FROM all_runs a
  ), best AS (
    SELECT row_number() OVER (ORDER BY r.igt) AS rank, r.*,
           (SELECT count(*) > 1 FROM all_runs a WHERE a.userid = r.userid AND a.igt = r.igt)
             AS best_time_tie,
           (SELECT jsonb_agg(a.run_id ORDER BY a.run_id) FROM all_runs a
             WHERE a.userid = r.userid AND a.igt = r.igt) AS candidate_run_ids
      FROM ranked r WHERE r.player_rn = 1
  )
  SELECT jsonb_build_object(
    'sheet_id', c.sheet_id, 'version', c.version, 'type', c.type,
    'ready', c.ready, 'mapping', c.mapping, 'baseline', c.baseline,
    'write_intent', c.write_intent,
    'source_hash', c.source_hash, 'source_polled_at', c.source_polled_at,
    'generation', c.generation, 'completed_generation', c.completed_generation,
    'snapshot', coalesce((SELECT jsonb_agg(to_jsonb(b) - 'player_rn' ORDER BY b.rank) FROM best b), '[]'::jsonb),
    'runs', coalesce((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.igt, a.run_id) FROM all_runs a), '[]'::jsonb),
    'users', coalesce((SELECT jsonb_agg(jsonb_build_object('id', u.id, 'nickname', u.nickname, 'bili_id', u.bili_id)
                                      ORDER BY u.id) FROM public.users u), '[]'::jsonb)
  ) FROM cfg c;
$$;

CREATE OR REPLACE FUNCTION mcsrcn_docs_sync.validate_document(p_mapping jsonb, p_baseline jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE e jsonb; capture_time timestamptz;
BEGIN
  IF p_mapping IS NULL OR jsonb_typeof(p_mapping) <> 'object'
     OR p_mapping->'schemaVersion' IS DISTINCT FROM '1'::jsonb
     OR jsonb_typeof(p_mapping->'columns') IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_mapping->'managed_rows') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'mapping requires schemaVersion=1, columns object and managed_rows array';
  END IF;
  IF jsonb_array_length(p_mapping->'managed_rows') > 10000 THEN
    RAISE EXCEPTION 'Too many managed rows';
  END IF;
  FOR e IN SELECT value FROM jsonb_array_elements(p_mapping->'managed_rows') LOOP
    IF jsonb_typeof(e) <> 'object'
       OR jsonb_typeof(e->'rowIndex') IS DISTINCT FROM 'number'
       OR coalesce(e->>'rowIndex', '') !~ '^(0|[1-9][0-9]{0,8})$'
       OR jsonb_typeof(e->'userid') IS DISTINCT FROM 'number'
       OR coalesce(e->>'userid', '') !~ '^[1-9][0-9]{0,18}$'
       OR jsonb_typeof(e->'run_id') IS DISTINCT FROM 'number'
       OR coalesce(e->>'run_id', '') !~ '^[1-9][0-9]{0,18}$' THEN
      RAISE EXCEPTION 'Invalid managed row: rowIndex is zero-based; userid/run_id must be positive integers';
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_mapping->'managed_rows') x
             GROUP BY x->>'rowIndex' HAVING count(*) > 1)
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_mapping->'managed_rows') x
                GROUP BY x->>'userid' HAVING count(*) > 1)
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(p_mapping->'managed_rows') x
                GROUP BY x->>'run_id' HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Managed row, player and run bindings must be unique per sheet';
  END IF;
  IF p_baseline IS NULL OR jsonb_typeof(p_baseline) <> 'object'
     OR jsonb_typeof(p_baseline->'gridData') IS DISTINCT FROM 'array'
     OR jsonb_typeof(p_baseline->'rowCount') IS DISTINCT FROM 'number'
     OR coalesce(p_baseline->>'rowCount', '') !~ '^(0|[1-9][0-9]{0,8})$'
     OR jsonb_typeof(p_baseline->'colCount') IS DISTINCT FROM 'number'
     OR coalesce(p_baseline->>'colCount', '') !~ '^[1-9][0-9]{0,5}$'
     OR jsonb_typeof(p_baseline->'captureTime') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'baseline requires raw gridData array, integer rowCount/colCount and captureTime';
  END IF;
  BEGIN
    capture_time := (p_baseline->>'captureTime')::timestamptz;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Invalid baseline captureTime';
  END;
  IF capture_time IS NULL OR NOT isfinite(capture_time)
     OR octet_length(p_baseline::text) > 20971520
     OR octet_length(p_mapping::text) > 2097152 THEN
    RAISE EXCEPTION 'Invalid or oversized document state';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_mapping->'managed_rows') x
             WHERE (x->>'rowIndex')::bigint >= (p_baseline->>'rowCount')::bigint) THEN
    RAISE EXCEPTION 'Managed row is outside captured document';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION mcsrcn_docs_sync.immutable_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Document snapshots are append-only' USING ERRCODE = '42501';
END;
$$;
DROP TRIGGER IF EXISTS docs_sync_snapshot_immutable ON mcsrcn_docs_sync.document_snapshots;
CREATE TRIGGER docs_sync_snapshot_immutable BEFORE UPDATE OR DELETE ON mcsrcn_docs_sync.document_snapshots
FOR EACH ROW EXECUTE FUNCTION mcsrcn_docs_sync.immutable_snapshot();
DROP TRIGGER IF EXISTS docs_sync_snapshot_no_truncate ON mcsrcn_docs_sync.document_snapshots;
CREATE TRIGGER docs_sync_snapshot_no_truncate BEFORE TRUNCATE ON mcsrcn_docs_sync.document_snapshots
FOR EACH STATEMENT EXECUTE FUNCTION mcsrcn_docs_sync.immutable_snapshot();

CREATE OR REPLACE FUNCTION mcsrcn_docs_sync.mark_dirty(p_sheet_id text)
RETURNS void LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = '' AS $$
  UPDATE mcsrcn_docs_sync.sheets
     SET generation = generation + 1, dirty_at = clock_timestamp(), next_attempt_at = clock_timestamp()
   WHERE sheet_id = p_sheet_id;
$$;

-- Independent polling transaction: stable, explicit verified source fields only.
-- Hash all verified rows, ordered by igt/id, including nickname. This avoids unstable
-- same-IGT PB tie choices and also catches removals, old-PB edits and version moves.
-- It does not modify source data, permissions, functions or triggers on public.runs/users.
CREATE OR REPLACE FUNCTION mcsrcn_docs_sync.reconcile()
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE s mcsrcn_docs_sync.sheets%ROWTYPE; fingerprint text; changed jsonb := '[]'::jsonb;
BEGIN
  PERFORM mcsrcn_docs_sync.assert_service();
  FOR s IN SELECT * FROM mcsrcn_docs_sync.sheets ORDER BY sheet_id FOR UPDATE LOOP
    SELECT encode(extensions.digest(coalesce(jsonb_agg(jsonb_build_object(
      'run_id', r.id, 'userid', r.userid, 'nickname', u.nickname, 'bili_id', u.bili_id,
      'igt', r.igt, 'date', r.date, 'version', r.version, 'type', r.type,
      'videolink', r.videolink, 'bvid', r.bvid, 'seed', r.seed,
      'remarks', r.remarks, 'subversion', r.subversion
    ) ORDER BY r.igt, r.id), '[]'::jsonb)::text, 'sha256'), 'hex') INTO fingerprint
      FROM public.runs r JOIN public.users u ON u.id = r.userid
     WHERE r.version = s.version AND r.type = s.type AND r.status = 'verified';
    IF fingerprint IS DISTINCT FROM s.source_hash THEN
      UPDATE mcsrcn_docs_sync.sheets SET source_hash = fingerprint,
        source_polled_at = clock_timestamp(), generation = generation + 1,
        dirty_at = clock_timestamp(), next_attempt_at = clock_timestamp()
        WHERE sheet_id = s.sheet_id;
      changed := changed || jsonb_build_array(s.sheet_id);
    ELSE
      UPDATE mcsrcn_docs_sync.sheets SET source_polled_at = clock_timestamp()
        WHERE sheet_id = s.sheet_id;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('scanned', 2, 'changed', changed);
END;
$$;

CREATE OR REPLACE FUNCTION public.docs_sync_source(p_sheet_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  PERFORM mcsrcn_docs_sync.assert_service();
  IF p_sheet_id IS NOT NULL AND p_sheet_id NOT IN ('BB08J2', 'BB08J3') THEN
    RAISE EXCEPTION 'Unsupported sheet';
  END IF;
  SELECT jsonb_build_object('sheets', coalesce(jsonb_agg(mcsrcn_docs_sync.source_sheet(s.sheet_id)
                             ORDER BY s.sheet_id), '[]'::jsonb)) INTO result
    FROM mcsrcn_docs_sync.sheets s WHERE p_sheet_id IS NULL OR s.sheet_id = p_sheet_id;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.docs_sync_state()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  PERFORM mcsrcn_docs_sync.assert_service();
  SELECT jsonb_build_object('enabled', c.enabled, 'last_dispatch_at', c.last_dispatch_at,
    'last_request_id', c.last_request_id,
    'sheets', (SELECT jsonb_agg(jsonb_build_object(
      'sheet_id', s.sheet_id, 'version', s.version, 'type', s.type, 'ready', s.ready,
      'generation', s.generation, 'completed_generation', s.completed_generation,
      'source_hash', s.source_hash, 'source_polled_at', s.source_polled_at,
      'dirty', s.generation > s.completed_generation, 'lease_until', s.lease_until,
      'lease_generation', s.lease_generation, 'attempts', s.attempts,
      'next_attempt_at', s.next_attempt_at, 'last_success_at', s.last_success_at,
      'last_error', s.last_error, 'has_write_intent', s.write_intent IS NOT NULL)
      ORDER BY s.sheet_id) FROM mcsrcn_docs_sync.sheets s))
  INTO result FROM mcsrcn_docs_sync.settings c WHERE singleton;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.docs_sync_set_enabled(p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM mcsrcn_docs_sync.assert_service();
  IF p_enabled IS NULL THEN RAISE EXCEPTION 'enabled is required'; END IF;
  PERFORM 1 FROM mcsrcn_docs_sync.settings WHERE singleton FOR UPDATE;
  IF p_enabled AND EXISTS (SELECT 1 FROM mcsrcn_docs_sync.sheets WHERE NOT ready) THEN
    RAISE EXCEPTION 'Prepare and configure both sheets before enabling';
  END IF;
  UPDATE mcsrcn_docs_sync.settings SET enabled = p_enabled, updated_at = clock_timestamp() WHERE singleton;
  RETURN public.docs_sync_state();
END;
$$;

CREATE OR REPLACE FUNCTION public.docs_sync_configure(p_sheet_id text, p_mapping jsonb, p_baseline jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE s mcsrcn_docs_sync.sheets%ROWTYPE; active boolean;
BEGIN
  PERFORM mcsrcn_docs_sync.assert_service();
  PERFORM mcsrcn_docs_sync.validate_document(p_mapping, p_baseline);
  SELECT enabled INTO active FROM mcsrcn_docs_sync.settings WHERE singleton FOR UPDATE;
  IF active THEN RAISE EXCEPTION 'Pause synchronization before configuring'; END IF;
  SELECT * INTO s FROM mcsrcn_docs_sync.sheets WHERE sheet_id = p_sheet_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unsupported sheet'; END IF;
  IF s.lease_until > clock_timestamp() THEN RAISE EXCEPTION 'Sheet still has a live lease'; END IF;
  IF s.write_intent IS NOT NULL THEN
    RAISE EXCEPTION 'Recover outstanding document write intent before reconfiguring';
  END IF;
  INSERT INTO mcsrcn_docs_sync.document_snapshots(sheet_id, event, generation,
      old_baseline, old_mapping, new_baseline, new_mapping, source)
  VALUES(s.sheet_id, 'configure', s.generation, s.baseline, s.mapping, p_baseline, p_mapping,
         mcsrcn_docs_sync.source_sheet(s.sheet_id));
  UPDATE mcsrcn_docs_sync.sheets SET mapping = p_mapping, baseline = p_baseline, ready = true,
      generation = generation + 1, dirty_at = clock_timestamp(), next_attempt_at = clock_timestamp(),
      lease_token = NULL, lease_until = NULL, lease_generation = NULL, lease_source = NULL, last_error = NULL
    WHERE sheet_id = s.sheet_id;
  RETURN public.docs_sync_state();
END;
$$;

CREATE OR REPLACE FUNCTION public.docs_sync_claim(p_limit integer DEFAULT 1, p_lease_seconds integer DEFAULT 180)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE s mcsrcn_docs_sync.sheets%ROWTYPE; active boolean; source jsonb;
        token uuid; deadline timestamptz; jobs jsonb := '[]'::jsonb;
BEGIN
  PERFORM mcsrcn_docs_sync.assert_service();
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 2
     OR p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 60 AND 600 THEN
    RAISE EXCEPTION 'limit must be 1..2; lease seconds must be 60..600';
  END IF;
  -- Lock config first everywhere; a simultaneous pause/configure cannot race a new claim.
  SELECT enabled INTO active FROM mcsrcn_docs_sync.settings WHERE singleton FOR SHARE;
  IF NOT active THEN RETURN jsonb_build_object('enabled', false, 'jobs', jobs); END IF;
  FOR s IN SELECT * FROM mcsrcn_docs_sync.sheets
     WHERE ready AND generation > completed_generation AND next_attempt_at <= clock_timestamp()
       AND (lease_until IS NULL OR lease_until <= clock_timestamp())
     ORDER BY sheet_id LIMIT p_limit FOR UPDATE SKIP LOCKED
  LOOP
    source := mcsrcn_docs_sync.source_sheet(s.sheet_id);
    token := gen_random_uuid();
    deadline := clock_timestamp() + make_interval(secs => p_lease_seconds);
    UPDATE mcsrcn_docs_sync.sheets SET lease_token = token, lease_until = deadline,
      lease_generation = s.generation, lease_source = source, attempts = attempts + 1
      WHERE sheet_id = s.sheet_id;
    jobs := jobs || jsonb_build_array(jsonb_build_object(
      'sheet_id', s.sheet_id, 'version', s.version, 'type', s.type,
      'generation', s.generation, 'lease_token', token, 'lease_until', deadline,
      'mapping', s.mapping, 'baseline', s.baseline,
      'write_intent', s.write_intent,
      'snapshot', source->'snapshot', 'source', source));
  END LOOP;
  RETURN jsonb_build_object('enabled', true, 'jobs', jobs);
END;
$$;

CREATE OR REPLACE FUNCTION public.docs_sync_renew(p_sheet_id text, p_lease_token uuid,
                                               p_lease_seconds integer DEFAULT 180)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE deadline timestamptz; generation bigint;
BEGIN
  PERFORM mcsrcn_docs_sync.assert_service();
  IF p_lease_seconds IS NULL OR p_lease_seconds NOT BETWEEN 60 AND 600 THEN
    RAISE EXCEPTION 'lease seconds must be 60..600';
  END IF;
  PERFORM 1 FROM mcsrcn_docs_sync.settings WHERE singleton AND enabled FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false); END IF;
  UPDATE mcsrcn_docs_sync.sheets s
    SET lease_until = greatest(s.lease_until, clock_timestamp() + make_interval(secs => p_lease_seconds))
    WHERE s.sheet_id = p_sheet_id AND s.lease_token = p_lease_token AND s.lease_until > clock_timestamp()
    RETURNING s.lease_until, s.lease_generation INTO deadline, generation;
  RETURN CASE WHEN deadline IS NULL THEN jsonb_build_object('ok', false)
    ELSE jsonb_build_object('ok', true, 'lease_until', deadline, 'generation', generation) END;
END;
$$;

CREATE OR REPLACE FUNCTION public.docs_sync_finish(p_sheet_id text, p_lease_token uuid, p_generation bigint,
                                                p_baseline jsonb, p_mapping jsonb)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE s mcsrcn_docs_sync.sheets%ROWTYPE;
BEGIN
  PERFORM mcsrcn_docs_sync.assert_service();
  SELECT * INTO s FROM mcsrcn_docs_sync.sheets
    WHERE sheet_id = p_sheet_id AND lease_token = p_lease_token
      AND lease_generation = p_generation AND lease_until > clock_timestamp() FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  PERFORM mcsrcn_docs_sync.validate_document(p_mapping, p_baseline);
  IF s.lease_until <= clock_timestamp() THEN RETURN false; END IF;
  -- Append backup FIRST, after lease validation, in the same transaction as acknowledgement.
  INSERT INTO mcsrcn_docs_sync.document_snapshots(sheet_id, event, generation,
      old_baseline, old_mapping, new_baseline, new_mapping, source)
  VALUES(s.sheet_id, 'finish', p_generation, s.baseline, s.mapping, p_baseline, p_mapping, s.lease_source);
  UPDATE mcsrcn_docs_sync.sheets SET completed_generation = p_generation,
    baseline = p_baseline, mapping = p_mapping, write_intent = NULL, lease_token = NULL, lease_until = NULL,
    lease_generation = NULL, lease_source = NULL, attempts = 0, last_error = NULL,
    last_success_at = clock_timestamp(), next_attempt_at = clock_timestamp()
    WHERE sheet_id = s.sheet_id;
  -- generation is deliberately untouched: changes committed during HTTP stay pending.
  RETURN true;
END;
$$;

-- Persist a complete recovery plan BEFORE the first external document mutation.
-- It survives fail(), lease expiry and a replacement claim. The worker must compare the
-- live document to before/after before computing another plan; unexpected contents block.
CREATE OR REPLACE FUNCTION public.docs_sync_record_intent(p_sheet_id text, p_lease_token uuid, p_intent jsonb)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE s mcsrcn_docs_sync.sheets%ROWTYPE;
BEGIN
  PERFORM mcsrcn_docs_sync.assert_service();
  SELECT * INTO s FROM mcsrcn_docs_sync.sheets
    WHERE sheet_id = p_sheet_id AND lease_token = p_lease_token AND lease_until > clock_timestamp()
    FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF p_intent IS NULL OR jsonb_typeof(p_intent) <> 'object'
     OR jsonb_typeof(p_intent->'generation') IS DISTINCT FROM 'number'
     OR coalesce(p_intent->>'generation', '') !~ '^[1-9][0-9]{0,18}$'
     OR (p_intent->>'generation')::numeric <> s.lease_generation THEN
    RAISE EXCEPTION 'Intent must name the currently claimed generation';
  END IF;
  PERFORM mcsrcn_docs_sync.validate_document(p_intent->'mapping', p_intent->'after');
  -- The new mapping can contain appended row indices beyond the old grid: validate the
  -- old raw baseline separately rather than incorrectly applying new mappings to it.
  PERFORM mcsrcn_docs_sync.validate_document(
    '{"schemaVersion":1,"columns":{},"managed_rows":[]}'::jsonb, p_intent->'before');
  IF s.lease_until <= clock_timestamp() THEN RETURN false; END IF;
  INSERT INTO mcsrcn_docs_sync.document_snapshots(sheet_id, event, generation,
    old_baseline, old_mapping, new_baseline, new_mapping, source)
  VALUES(s.sheet_id, 'intent', s.lease_generation, p_intent->'before', s.mapping,
    p_intent->'after', p_intent->'mapping', s.lease_source);
  UPDATE mcsrcn_docs_sync.sheets SET write_intent = p_intent WHERE sheet_id = s.sheet_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.docs_sync_fail(p_sheet_id text, p_lease_token uuid, p_error text,
                                              p_retry_seconds integer DEFAULT 60)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE changed integer;
BEGIN
  PERFORM mcsrcn_docs_sync.assert_service();
  IF p_retry_seconds IS NULL OR p_retry_seconds NOT BETWEEN 5 AND 3600 THEN
    RAISE EXCEPTION 'retry seconds must be 5..3600';
  END IF;
  UPDATE mcsrcn_docs_sync.sheets SET lease_token = NULL, lease_until = NULL, lease_generation = NULL,
    lease_source = NULL, last_error = left(coalesce(p_error, 'Unspecified worker failure'), 2000),
    next_attempt_at = clock_timestamp() + make_interval(secs => p_retry_seconds)
    WHERE sheet_id = p_sheet_id AND lease_token = p_lease_token;
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed = 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.docs_sync_requeue(p_sheet_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE affected text;
BEGIN
  PERFORM mcsrcn_docs_sync.assert_service();
  IF p_sheet_id IS NOT NULL AND p_sheet_id NOT IN ('BB08J2', 'BB08J3') THEN
    RAISE EXCEPTION 'Unsupported sheet';
  END IF;
  FOR affected IN SELECT sheet_id FROM mcsrcn_docs_sync.sheets
    WHERE p_sheet_id IS NULL OR sheet_id = p_sheet_id ORDER BY sheet_id
  LOOP PERFORM mcsrcn_docs_sync.mark_dirty(affected); END LOOP;
  RETURN public.docs_sync_state();
END;
$$;

CREATE OR REPLACE FUNCTION public.docs_sync_backups(p_sheet_id text, p_limit integer DEFAULT 20)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
  PERFORM mcsrcn_docs_sync.assert_service();
  IF p_sheet_id NOT IN ('BB08J2', 'BB08J3') OR p_sheet_id IS NULL
     OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Valid sheet and limit 1..100 required';
  END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(b) ORDER BY b.id DESC), '[]'::jsonb) INTO result
    FROM (SELECT * FROM mcsrcn_docs_sync.document_snapshots
           WHERE sheet_id = p_sheet_id ORDER BY id DESC LIMIT p_limit) b;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.docs_sync_issue_nonce(p_scope text, p_ttl_seconds integer DEFAULT 60)
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE token text;
BEGIN
  PERFORM mcsrcn_docs_sync.assert_service();
  IF p_scope IS NULL OR p_scope NOT IN ('inspect', 'prepare', 'process')
     OR p_ttl_seconds IS NULL OR p_ttl_seconds NOT BETWEEN 10 AND 300 THEN
    RAISE EXCEPTION 'scope must be inspect/prepare/process; TTL must be 10..300 seconds';
  END IF;
  token := translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');
  INSERT INTO mcsrcn_docs_sync.nonces(nonce_hash, scope, expires_at)
  VALUES(extensions.digest(token, 'sha256'), p_scope,
         clock_timestamp() + make_interval(secs => p_ttl_seconds));
  DELETE FROM mcsrcn_docs_sync.nonces WHERE expires_at < clock_timestamp() - interval '1 day';
  RETURN token;
END;
$$;

CREATE OR REPLACE FUNCTION public.docs_sync_consume_nonce(p_nonce text, p_scope text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE accepted_scope text;
BEGIN
  PERFORM mcsrcn_docs_sync.assert_service();
  IF p_nonce IS NULL OR p_nonce !~ '^[A-Za-z0-9_-]{43}$'
     OR p_scope IS NULL OR p_scope NOT IN ('inspect', 'prepare', 'process') THEN
    RETURN jsonb_build_object('valid', false);
  END IF;
  UPDATE mcsrcn_docs_sync.nonces SET consumed_at = clock_timestamp()
    WHERE nonce_hash = extensions.digest(p_nonce, 'sha256') AND scope = p_scope
      AND consumed_at IS NULL AND expires_at > clock_timestamp()
    RETURNING scope INTO accepted_scope;
  RETURN CASE WHEN accepted_scope IS NULL THEN jsonb_build_object('valid', false)
    ELSE jsonb_build_object('valid', true, 'scope', accepted_scope) END;
END;
$$;

-- Called later by a postgres pg_cron job. The fixed URL/body cannot be redirected by clients.
-- Plaintext nonce is passed only to pg_net's HTTP queue (never stored in our tables/logs).
-- pg_net queue headers necessarily contain that short-lived one-use token until delivery.
CREATE OR REPLACE FUNCTION mcsrcn_docs_sync.dispatch()
RETURNS bigint LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE c mcsrcn_docs_sync.settings%ROWTYPE; token text; request_id bigint;
BEGIN
  PERFORM mcsrcn_docs_sync.assert_service();
  SELECT * INTO c FROM mcsrcn_docs_sync.settings WHERE singleton FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN RETURN NULL; END IF;
  -- Poll even when there are currently no dirty jobs (and while paused). No source
  -- transaction participates; a polling failure only aborts this independent dispatch.
  PERFORM mcsrcn_docs_sync.reconcile();
  IF NOT c.enabled OR c.last_dispatch_at > clock_timestamp() - interval '50 seconds' THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM mcsrcn_docs_sync.sheets
      WHERE ready AND generation > completed_generation AND next_attempt_at <= clock_timestamp()
        AND (lease_until IS NULL OR lease_until <= clock_timestamp())) THEN RETURN NULL; END IF;
  token := public.docs_sync_issue_nonce('process', 90);
  SELECT net.http_post(
    url := 'https://wdkxjftlgidebtczszsq.supabase.co/functions/v1/tencent-docs-sync/process',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || token),
    timeout_milliseconds := 120000
  ) INTO request_id;
  UPDATE mcsrcn_docs_sync.settings SET last_dispatch_at = clock_timestamp(),
    last_request_id = request_id WHERE singleton;
  RETURN request_id;
END;
$$;

-- Explicitly own privileged functions as postgres, remove defaults/old ACLs, then grant
-- only the named service APIs. The private snapshot immutability trigger has no public ACL.
DO $permissions$
DECLARE f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS identity FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'mcsrcn_docs_sync'
       OR (n.nspname = 'public' AND p.proname IN (
        'docs_sync_source', 'docs_sync_state', 'docs_sync_set_enabled', 'docs_sync_configure',
        'docs_sync_claim', 'docs_sync_renew', 'docs_sync_finish', 'docs_sync_fail', 'docs_sync_record_intent',
        'docs_sync_requeue', 'docs_sync_backups', 'docs_sync_issue_nonce', 'docs_sync_consume_nonce'))
  LOOP
    EXECUTE format('ALTER FUNCTION %s OWNER TO postgres', f.identity);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated, service_role', f.identity);
    IF f.identity::text LIKE 'docs_sync_%' OR f.identity::text LIKE 'public.docs_sync_%' THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', f.identity);
    END IF;
  END LOOP;
END;
$permissions$;
GRANT EXECUTE ON FUNCTION mcsrcn_docs_sync.dispatch() TO service_role;
GRANT EXECUTE ON FUNCTION mcsrcn_docs_sync.reconcile() TO service_role;

-- Deployment remains paused. Re-running the migration preserves existing enabled state,
-- generations and backups; it neither resets state nor registers a cron job.
NOTIFY pgrst, 'reload schema';
COMMIT;

