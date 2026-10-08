-- Install/update ONE postgres-owned polling job. Run as postgres after review.
-- This does not enable document writes: docs_sync_set_enabled(true) is a separate action.
-- No changes to public.runs/users, their permissions, policies or triggers.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';

DO $preflight$
BEGIN
  -- cron.schedule uses current_user as the future job's login identity. service_role is
  -- normally NOLOGIN, so do not schedule this job through a service-role REST connection.
  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Install this cron job as postgres (current role: %)', current_user;
  END IF;
  IF to_regprocedure('mcsrcn_docs_sync.dispatch()') IS NULL
     OR to_regprocedure('mcsrcn_docs_sync.reconcile()') IS NULL THEN
    RAISE EXCEPTION 'Install add_read_only_tencent_docs_sync first';
  END IF;
  IF NOT has_function_privilege('postgres', 'mcsrcn_docs_sync.dispatch()', 'EXECUTE')
     OR has_function_privilege('anon', 'mcsrcn_docs_sync.dispatch()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'mcsrcn_docs_sync.dispatch()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected dispatch ACL; review before scheduling';
  END IF;
END;
$preflight$;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

DO $schedule$
DECLARE scheduled_job_id bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('mcsrcn-tencent-docs-sync-cron-install', 0));
  IF EXISTS (SELECT 1 FROM cron.job
             WHERE jobname = 'mcsrcn-tencent-docs-sync' AND username <> 'postgres') THEN
    RAISE EXCEPTION 'A different owner already uses this job name; review rather than duplicate it';
  END IF;
  SELECT cron.schedule('mcsrcn-tencent-docs-sync', '* * * * *',
                       'select mcsrcn_docs_sync.dispatch();') INTO scheduled_job_id;
  -- Named schedule upserts schedule/command/database, but does not reactivate an old
  -- inactive job. alter_job(active=true) makes repeated installation fully idempotent.
  -- Do not pass username: changing it unnecessarily requires true superuser privileges.
  PERFORM cron.alter_job(scheduled_job_id, active := true);
  IF (SELECT count(*) FROM cron.job WHERE jobname = 'mcsrcn-tencent-docs-sync') <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one job with the requested name';
  END IF;
END;
$schedule$;
COMMIT;

SELECT jobid, jobname, schedule, command, database, username, active
  FROM cron.job WHERE jobname = 'mcsrcn-tencent-docs-sync';
