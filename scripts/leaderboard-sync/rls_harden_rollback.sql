-- 仅供紧急回退本次权限配置：不修改业务数据。
-- 会恢复修复前的宽松权限，正常情况请勿执行。
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';
DROP TRIGGER IF EXISTS users_guard_columns ON public.users;
DROP FUNCTION IF EXISTS public.guard_users_columns();
DROP POLICY IF EXISTS "Enable read access for all users" ON public."runs";
CREATE POLICY "Enable read access for all users" ON public."runs" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);
DROP POLICY IF EXISTS "admin" ON public."runs";
CREATE POLICY "admin" ON public."runs" AS PERMISSIVE FOR ALL TO PUBLIC USING (is_admin());
DROP POLICY IF EXISTS "allow user upload their runs" ON public."runs";
CREATE POLICY "allow user upload their runs" ON public."runs" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK (true);
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public."users";
CREATE POLICY "Enable insert for authenticated users only" ON public."users" AS PERMISSIVE FOR INSERT TO PUBLIC WITH CHECK ((user_id = auth.uid()));
DROP POLICY IF EXISTS "Enable read access for all users" ON public."users";
CREATE POLICY "Enable read access for all users" ON public."users" AS PERMISSIVE FOR SELECT TO PUBLIC USING (true);
DROP POLICY IF EXISTS "admin" ON public."users";
CREATE POLICY "admin" ON public."users" AS PERMISSIVE FOR ALL TO PUBLIC USING (is_admin());
DROP POLICY IF EXISTS "allow user bind unbounded nickname" ON public."users";
CREATE POLICY "allow user bind unbounded nickname" ON public."users" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((user_id IS NULL)) WITH CHECK ((user_id = auth.uid()));
DROP POLICY IF EXISTS "allow user update own info" ON public."users";
CREATE POLICY "allow user update own info" ON public."users" AS PERMISSIVE FOR UPDATE TO PUBLIC USING ((user_id = auth.uid()));
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  select exists (
    select 1
    from users
    where user_id = auth.uid()
      and role = 'admin'
  );
$function$
;
ALTER FUNCTION public."get_leaderboard"(text,text,text) RESET ALL;
ALTER FUNCTION public."get_runs_by_status"(text) RESET ALL;
ALTER FUNCTION public."is_admin"() RESET ALL;
GRANT EXECUTE ON FUNCTION public.is_admin() TO PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON public.users, public.runs FROM PUBLIC, anon, authenticated;
GRANT ALL PRIVILEGES ON public.users, public.runs TO anon, authenticated;
ALTER TABLE public._bk_20260910_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public._bk_20260910_runs DISABLE ROW LEVEL SECURITY;
GRANT ALL PRIVILEGES ON public._bk_20260910_users, public._bk_20260910_runs TO anon, authenticated;
COMMIT;

