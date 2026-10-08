-- 权限修复：保留上传、审核、改名、MC 绑定和未认领档案的自助绑定。
-- 只修改策略、函数、触发器和授权，不新增、修改、删除业务数据。
-- 此文件默认回滚；实际迁移使用 BEGIN/ROLLBACK 之间的内容。
-- 不执行 import_20260910.sql，也不合并玩家档案。
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';

-- 临时校验仅保存行数和摘要，提交/回滚时自动清理，不复制用户数据。
CREATE TEMP TABLE _permission_data_before (
  table_name text PRIMARY KEY,
  row_count bigint NOT NULL,
  digest text NOT NULL
) ON COMMIT DROP;
CREATE TEMP TABLE _permission_sequences_before ON COMMIT DROP AS
  SELECT sequencename, last_value FROM pg_sequences WHERE schemaname = 'public';
DO $snapshot$
DECLARE
  target text;
  total bigint;
  checksum text;
BEGIN
  FOR target IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY c.relname
  LOOP
    EXECUTE format(
      'SELECT count(*), md5(coalesce(string_agg(to_jsonb(t)::text, '','' ORDER BY to_jsonb(t)::text), '''')) FROM public.%I t',
      target
    ) INTO total, checksum;
    INSERT INTO pg_temp._permission_data_before VALUES (target, total, checksum);
  END LOOP;
END
$snapshot$;

-- 若有人新增了其他策略，停止执行，避免遗漏额外放行规则。
DO $preflight$
BEGIN
  IF EXISTS (
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('runs', 'users')
    EXCEPT
    SELECT * FROM (VALUES
      ('runs', 'Enable read access for all users'),
      ('runs', 'admin'),
      ('runs', 'allow user upload their runs'),
      ('users', 'Enable insert for authenticated users only'),
      ('users', 'Enable read access for all users'),
      ('users', 'admin'),
      ('users', 'allow user bind unbounded nickname'),
      ('users', 'allow user update own info')
    ) expected(tablename, policyname)
  ) OR (SELECT count(*) FROM pg_policies
        WHERE schemaname = 'public' AND tablename IN ('runs', 'users')) <> 8 THEN
    RAISE EXCEPTION 'runs/users policies changed; review before applying';
  END IF;
END
$preflight$;

-- 继续使用现有管理员判定，固定对象查找范围，避免 users 策略自递归。
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id = (SELECT auth.uid()) AND u.role = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- 两个查询函数保持原有查询逻辑和 SECURITY INVOKER，只固定 search_path。
ALTER FUNCTION public.get_leaderboard(text, text, text) SET search_path = '';
ALTER FUNCTION public.get_runs_by_status(text) SET search_path = '';

-- 原位修改已核对的策略，保留管理员录入、修改、审核和删除权限。
ALTER POLICY "admin" ON public.runs TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));
ALTER POLICY "admin" ON public.users TO authenticated
  USING ((SELECT public.is_admin())) WITH CHECK ((SELECT public.is_admin()));

-- 公开成绩照常读取；登录用户仍能看到自己的 pending/rejected，管理员全部可读。
ALTER POLICY "Enable read access for all users" ON public.runs TO anon, authenticated
  USING (
    status = 'verified'
    OR userid IN (SELECT u.id FROM public.users u WHERE u.user_id = (SELECT auth.uid()))
  );
ALTER POLICY "allow user upload their runs" ON public.runs TO authenticated
  WITH CHECK (
    status = 'pending'
    AND userid IN (SELECT u.id FROM public.users u WHERE u.user_id = (SELECT auth.uid()))
  );

-- 保留匿名主页、管理员用户列表和新用户自建档案。
ALTER POLICY "Enable read access for all users" ON public.users TO anon, authenticated
  USING (true);
ALTER POLICY "Enable insert for authenticated users only" ON public.users TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));
ALTER POLICY "allow user update own info" ON public.users TO authenticated
  USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));

-- 现有前端 bindUser() 直接把未绑定档案的 user_id 设为当前账号，继续支持。
-- 管理员档案不能通过这条自助策略认领，列级检查还会限制本次只能改变 user_id。
ALTER POLICY "allow user bind unbounded nickname" ON public.users TO authenticated
  USING (user_id IS NULL AND coalesce(role, 'user') = 'user')
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_users_columns()
RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  -- 使用实际数据库角色区分后台操作；auth.uid() 为空不能单独证明后台身份。
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.user_id IS DISTINCT FROM caller_id
       OR coalesce(NEW.role, 'user') <> 'user'
       OR NEW.bili_id IS NOT NULL THEN
      RAISE EXCEPTION 'Only an ordinary profile for the current account may be created'
        USING ERRCODE = '42501';
    END IF;
  ELSIF OLD.user_id IS NULL THEN
    IF NEW.user_id IS DISTINCT FROM caller_id
       OR coalesce(OLD.role, 'user') <> 'user'
       OR (to_jsonb(NEW) - 'user_id') IS DISTINCT FROM (to_jsonb(OLD) - 'user_id') THEN
      RAISE EXCEPTION 'Claiming an unbound profile may only set user_id to the current account'
        USING ERRCODE = '42501';
    END IF;
  ELSE
    IF OLD.user_id IS DISTINCT FROM caller_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW.bili_id IS DISTINCT FROM OLD.bili_id THEN
      RAISE EXCEPTION 'Profile ownership, role, id and Bilibili UID are protected'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_users_columns() FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE TRIGGER users_guard_columns
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_users_columns();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.users, public.runs FROM PUBLIC, anon;
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.users, public.runs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.users, public.runs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.users, public.runs TO authenticated;

-- 保留历史备份内容和 service_role/Dashboard 访问，关闭客户端访问。
DO $backups$
DECLARE
  backup_name text;
BEGIN
  FOR backup_name IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relname IN ('_bk_20260910_users', '_bk_20260910_runs')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', backup_name);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', backup_name);
  END LOOP;
END
$backups$;

-- 在提交前用真实 API 角色只读检查；任何断言失败会让整次迁移回滚。
DO $verify$
DECLARE
  expected_users bigint;
  expected_verified bigint;
  expected_runs bigint;
  expected_pending bigint;
  expected_board text;
  actual_board text;
  expected_own bigint;
  actual_count bigint;
  member_uid uuid;
  admin_uid uuid;
  backup_name text;
  api_role text;
  previous_role text := current_setting('role');
  previous_sub text := current_setting('request.jwt.claim.sub', true);
  previous_claims text := current_setting('request.jwt.claims', true);
BEGIN
  SELECT count(*) INTO expected_users FROM public.users;
  SELECT count(*) INTO expected_runs FROM public.runs;
  SELECT count(*) INTO expected_verified FROM public.runs WHERE status = 'verified';
  SELECT count(*) INTO expected_pending FROM public.get_runs_by_status('pending');
  SELECT md5(coalesce(string_agg(to_jsonb(t)::text, ',' ORDER BY t.run_id), ''))
    INTO expected_board FROM public.get_leaderboard() t;
  SELECT user_id INTO member_uid FROM public.users
    WHERE user_id IS NOT NULL AND role IS DISTINCT FROM 'admin' ORDER BY id LIMIT 1;
  SELECT user_id INTO admin_uid FROM public.users
    WHERE user_id IS NOT NULL AND role = 'admin' ORDER BY id LIMIT 1;

  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  PERFORM set_config('role', 'anon', true);
  SELECT count(*) INTO actual_count FROM public.users;
  IF actual_count <> expected_users THEN
    RAISE EXCEPTION 'Anonymous profile access changed';
  END IF;
  SELECT count(*) INTO actual_count FROM public.runs;
  IF actual_count <> expected_verified THEN
    RAISE EXCEPTION 'Anonymous run visibility is incorrect';
  END IF;
  SELECT count(*) INTO actual_count FROM public.get_runs_by_status('pending');
  IF actual_count <> 0 THEN
    RAISE EXCEPTION 'Anonymous pending RPC access is still open';
  END IF;
  SELECT md5(coalesce(string_agg(to_jsonb(t)::text, ',' ORDER BY t.run_id), ''))
    INTO actual_board FROM public.get_leaderboard() t;
  IF actual_board IS DISTINCT FROM expected_board THEN
    RAISE EXCEPTION 'Public leaderboard output changed';
  END IF;
  IF has_table_privilege('anon', 'public.runs', 'INSERT')
     OR has_table_privilege('anon', 'public.users', 'UPDATE')
     OR has_function_privilege('anon', 'public.is_admin()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Anonymous write or administrator helper privileges remain';
  END IF;
  PERFORM set_config('role', previous_role, true);

  IF member_uid IS NOT NULL THEN
    SELECT count(*) INTO expected_own FROM public.runs r
      WHERE r.userid IN (SELECT u.id FROM public.users u WHERE u.user_id = member_uid);
    PERFORM set_config('request.jwt.claim.sub', member_uid::text, true);
    PERFORM set_config('request.jwt.claims',
      jsonb_build_object('role', 'authenticated', 'sub', member_uid)::text, true);
    PERFORM set_config('role', 'authenticated', true);
    SELECT count(*) INTO actual_count FROM public.runs r
      WHERE r.userid IN (SELECT u.id FROM public.users u WHERE u.user_id = auth.uid());
    IF actual_count <> expected_own OR public.is_admin() THEN
      RAISE EXCEPTION 'Member history access or administrator detection is incorrect';
    END IF;
    SELECT count(*) INTO actual_count FROM public.runs r
      WHERE r.status IS DISTINCT FROM 'verified'
        AND r.userid NOT IN (SELECT u.id FROM public.users u WHERE u.user_id = auth.uid());
    IF actual_count <> 0 THEN
      RAISE EXCEPTION 'Another player private runs are visible';
    END IF;
    PERFORM set_config('role', previous_role, true);
  END IF;

  IF admin_uid IS NOT NULL THEN
    PERFORM set_config('request.jwt.claim.sub', admin_uid::text, true);
    PERFORM set_config('request.jwt.claims',
      jsonb_build_object('role', 'authenticated', 'sub', admin_uid)::text, true);
    PERFORM set_config('role', 'authenticated', true);
    SELECT count(*) INTO actual_count FROM public.runs;
    IF actual_count <> expected_runs OR NOT public.is_admin() THEN
      RAISE EXCEPTION 'Administrator run access changed';
    END IF;
    SELECT count(*) INTO actual_count FROM public.get_runs_by_status('pending');
    IF actual_count <> expected_pending THEN
      RAISE EXCEPTION 'Administrator review queue changed';
    END IF;
    PERFORM set_config('role', previous_role, true);
  END IF;

  FOR backup_name IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
      AND c.relname IN ('_bk_20260910_users', '_bk_20260910_runs')
  LOOP
    FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_table_privilege(api_role, format('public.%I', backup_name), 'SELECT')
         OR has_table_privilege(api_role, format('public.%I', backup_name), 'INSERT')
         OR has_table_privilege(api_role, format('public.%I', backup_name), 'UPDATE')
         OR has_table_privilege(api_role, format('public.%I', backup_name), 'DELETE')
         OR has_table_privilege(api_role, format('public.%I', backup_name), 'TRUNCATE') THEN
        RAISE EXCEPTION 'Backup client privileges remain on %', backup_name;
      END IF;
    END LOOP;
  END LOOP;
  PERFORM set_config('request.jwt.claim.sub', coalesce(previous_sub, ''), true);
  PERFORM set_config('request.jwt.claims', coalesce(previous_claims, ''), true);
END
$verify$;

DO $integrity$
DECLARE
  snapshot record;
  total bigint;
  checksum text;
BEGIN
  FOR snapshot IN SELECT * FROM pg_temp._permission_data_before LOOP
    EXECUTE format(
      'SELECT count(*), md5(coalesce(string_agg(to_jsonb(t)::text, '','' ORDER BY to_jsonb(t)::text), '''')) FROM public.%I t',
      snapshot.table_name
    ) INTO total, checksum;
    IF total IS DISTINCT FROM snapshot.row_count OR checksum IS DISTINCT FROM snapshot.digest THEN
      RAISE EXCEPTION 'Business data changed in %; aborting permission migration', snapshot.table_name;
    END IF;
  END LOOP;
  IF EXISTS (
    (SELECT sequencename, last_value FROM pg_sequences WHERE schemaname = 'public'
     EXCEPT SELECT * FROM pg_temp._permission_sequences_before)
    UNION ALL
    (SELECT * FROM pg_temp._permission_sequences_before
     EXCEPT SELECT sequencename, last_value FROM pg_sequences WHERE schemaname = 'public')
  ) THEN
    RAISE EXCEPTION 'A business sequence changed; aborting permission migration';
  END IF;
END
$integrity$;

ROLLBACK;
