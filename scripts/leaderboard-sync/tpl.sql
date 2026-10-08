-- ============================================================================
-- 1.16.1/RSG + 1.15.2/RSG 榜单同步        生成于 2026-09-10
-- 来源: 腾讯文档 DZnVPZ0JhTGVWdFZi (tab BB08J2 / BB08J3)
--       + B站 api/web-interface/view 解析 BV -> mid(UP主永久数字ID)
-- 用法: Supabase Dashboard -> SQL Editor 整段执行；出错自动整体回滚
-- 说明: 只新增、只改名、只补关联，不删除任何 runs
-- ============================================================================
BEGIN;

-- ===== 0. 备份（确认无误后手动 DROP）=====
DROP TABLE IF EXISTS _bk_20260910_users;
DROP TABLE IF EXISTS _bk_20260910_runs;
CREATE TABLE _bk_20260910_users AS SELECT * FROM users;
CREATE TABLE _bk_20260910_runs  AS SELECT * FROM runs;
ALTER TABLE _bk_20260910_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE _bk_20260910_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON _bk_20260910_users, _bk_20260910_runs
  FROM PUBLIC, anon, authenticated;

-- ===== 1. 结构：runs.bvid 是以后做自动同步和防重复的键 =====
-- users.bili_id 生产上本来就有唯一索引 users_bili_id_key（NULL 之间互不冲突），
-- 早期失败执行留下的 users_bili_id_uidx 是冗余的，这里清掉且不再重建。
DROP INDEX IF EXISTS users_bili_id_uidx;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS bvid text;
CREATE INDEX IF NOT EXISTS runs_bvid_idx ON runs (bvid);

UPDATE runs SET bvid = (regexp_match(videolink, 'BV[A-Za-z0-9]{10}'))[1]
 WHERE bvid IS NULL AND videolink ~ 'BV[A-Za-z0-9]{10}';

-- ===== 2. 暂存：已解析成功的 BV -> mid =====
CREATE TEMP TABLE stg_bv (bvid text PRIMARY KEY, mid bigint, bname text);
--@@BV_INSERT@@

-- ===== 3. 暂存：文档有、站点没有的成绩 =====
CREATE TEMP TABLE stg_new_run (version text, type text, bvid text, doc_name text,
                               mid bigint, igt text, rdate text, videolink text,
                               seed text, remarks text, rank_no int);
--@@NEWRUN_INSERT@@

-- ===== 4. 所有权表：一个 mid 只能归一个用户，一个用户只能有一个 mid =====
-- 4a. 由站点已有 verified 成绩推出（该玩家名下可解析视频必须只有单一 mid，
--     且这个 mid 不能被别的玩家同时主张）
CREATE TEMP TABLE stg_user_one_mid AS
  SELECT r.userid, min(s.mid) AS mid
    FROM runs r JOIN stg_bv s ON s.bvid = r.bvid
   WHERE r.status = 'verified'
   GROUP BY r.userid
  HAVING count(DISTINCT s.mid) = 1;

CREATE TEMP TABLE stg_owner (mid bigint PRIMARY KEY, userid numeric UNIQUE NOT NULL, via text);

INSERT INTO stg_owner (mid, userid, via)
  SELECT m.mid, m.userid, 'run'
    FROM stg_user_one_mid m
   WHERE (SELECT count(*) FROM stg_user_one_mid o WHERE o.mid = m.mid) = 1;

-- 4b. 文档行的 mid 落到一个"同名且尚未被认领"的现有档案上
INSERT INTO stg_owner (mid, userid, via)
  SELECT x.mid, x.userid, 'nick' FROM (
    SELECT DISTINCT ON (s.mid) s.mid, tgt.id AS userid
      FROM stg_new_run s
      JOIN LATERAL (SELECT u.id FROM users u
                     WHERE btrim(u.nickname) = btrim(s.doc_name)
                       AND NOT EXISTS (SELECT 1 FROM stg_owner o WHERE o.userid = u.id)
                     ORDER BY (u.bili_id IS NOT NULL) DESC, u.id
                     LIMIT 1) tgt ON true
     WHERE s.mid IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM stg_owner o WHERE o.mid = s.mid)
     ORDER BY s.mid, tgt.id) x
 WHERE NOT EXISTS (SELECT 1 FROM stg_owner o WHERE o.userid = x.userid);

-- 4c. 谁都不认识的，建新档案
--     昵称一律用文档名：与第 7 步的策略保持一致（B站单方面与文档不符的名字不自动采用）
CREATE TEMP TABLE stg_need_player AS
  SELECT DISTINCT ON (coalesce(s.mid::text, s.doc_name))
         s.mid, s.doc_name, btrim(s.doc_name) AS nickname
    FROM stg_new_run s
   WHERE NOT EXISTS (SELECT 1 FROM stg_owner o WHERE o.mid = s.mid)
     AND NOT EXISTS (SELECT 1 FROM users u WHERE btrim(u.nickname) = btrim(s.doc_name))
   ORDER BY coalesce(s.mid::text, s.doc_name), s.rank_no;

INSERT INTO users (nickname, bili_id, role)
  SELECT y.nickname, y.mid::text, 'user' FROM (
    SELECT DISTINCT ON (nickname) nickname, mid
      FROM stg_need_player ORDER BY nickname, mid) y;

INSERT INTO stg_owner (mid, userid, via)
  SELECT p.mid, u.id, 'new'
    FROM stg_need_player p JOIN users u ON btrim(u.nickname) = p.nickname
   WHERE p.mid IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM stg_owner o WHERE o.mid = p.mid OR o.userid = u.id);

-- ===== 5. 回填 users.bili_id =====
UPDATE users u SET bili_id = o.mid::text
  FROM stg_owner o WHERE u.id = o.userid AND u.bili_id IS NULL;

-- ===== 6. 插入新成绩（mid 优先、同名兜底；bvid 或同玩家同成绩已存在则跳过）=====
INSERT INTO runs (userid, igt, date, version, type, videolink, seed, remarks, status, bvid)
  SELECT COALESCE(o.userid, n.userid), s.igt, s.rdate, s.version, s.type,
         NULLIF(s.videolink, ''), NULLIF(s.seed, ''), NULLIF(s.remarks, ''),
         'verified', NULLIF(s.bvid, '')
    FROM stg_new_run s
    LEFT JOIN stg_owner o ON o.mid = s.mid
    LEFT JOIN LATERAL (SELECT u.id AS userid FROM users u
                        WHERE btrim(u.nickname) = btrim(s.doc_name)
                        ORDER BY (u.bili_id IS NOT NULL) DESC, u.id
                        LIMIT 1) n ON o.userid IS NULL
   WHERE COALESCE(o.userid, n.userid) IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM runs r
                      WHERE r.bvid IS NOT NULL AND r.bvid = NULLIF(s.bvid, ''))
     AND NOT EXISTS (SELECT 1 FROM runs r2
                      WHERE r2.userid = COALESCE(o.userid, n.userid)
                        AND r2.igt = s.igt AND r2.version = s.version AND r2.type = s.type);

-- ===== 7. 昵称同步（只改 users.nickname，runs 靠 userid 关联不受影响）=====
-- 仅包含"文档名 == B站现名 != 站点名"的项；B站单方面与文档不符的见报告 4b，未写入。
--@@NICK@@

-- ===== 7b. 清掉昵称里的首尾空格（如 users.id=171 '怂骨素 '）=====
UPDATE users SET nickname = btrim(nickname) WHERE nickname <> btrim(nickname);

-- ===== 8. 校验：执行后看这一段，数字符合预期再 COMMIT =====
SELECT '1.16.1 RSG 成绩总数' AS metric, count(*) AS n FROM runs
 WHERE version='1.16.1' AND type='RSG' AND status='verified'
UNION ALL SELECT '1.15.2 RSG 成绩总数', count(*) FROM runs
 WHERE version='1.15.2' AND type='RSG' AND status='verified'
UNION ALL SELECT '1.16.1 实际上榜人数(每人一条)', count(DISTINCT userid) FROM runs
 WHERE version='1.16.1' AND type='RSG' AND status='verified'
UNION ALL SELECT '1.15.2 实际上榜人数(每人一条)', count(DISTINCT userid) FROM runs
 WHERE version='1.15.2' AND type='RSG' AND status='verified'
UNION ALL SELECT 'users 总数', count(*) FROM users
UNION ALL SELECT 'bili_id 已回填', count(*) FROM users WHERE bili_id IS NOT NULL
UNION ALL SELECT 'runs.bvid 已填', count(*) FROM runs WHERE bvid IS NOT NULL
UNION ALL SELECT '异常:同 bili_id 多档案', count(*) FROM
  (SELECT bili_id FROM users WHERE bili_id IS NOT NULL GROUP BY bili_id HAVING count(*)>1) d
UNION ALL SELECT '异常:同昵称多档案', count(*) FROM
  (SELECT nickname FROM users GROUP BY nickname HAVING count(*)>1) e
UNION ALL SELECT '异常:孤儿成绩(userid无档案)', count(*) FROM runs r
  WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = r.userid)
UNION ALL SELECT '新插入成绩条数', count(*) FROM runs r
  WHERE r.id NOT IN (SELECT id FROM _bk_20260910_runs)
UNION ALL SELECT '新建档案条数', count(*) FROM users u
  WHERE u.id NOT IN (SELECT id FROM _bk_20260910_users)
UNION ALL SELECT '被改昵称的档案', count(*) FROM users u
  JOIN _bk_20260910_users b ON b.id = u.id WHERE b.nickname IS DISTINCT FROM u.nickname
ORDER BY 1;

-- ============================================================================
-- 第 1 遍：保持 ROLLBACK; 直接执行 —— 上面的校验数字照常返回，但所有改动丢弃，
--          生产数据零变化。这是真正的 dry-run。
-- 第 2 遍：确认数字符合预期后，把下面这一行 ROLLBACK; **替换成** COMMIT; 再执行一次。
--          （只删掉 ROLLBACK 是不行的：BEGIN 后不提交，连接断开时会自动回滚）
-- ============================================================================
ROLLBACK;

/* ----------------------------------------------------------------------------
   万一落库后发现不对，用备份表整体还原：

   BEGIN;
   DELETE FROM runs;
   INSERT INTO runs SELECT * FROM _bk_20260910_runs;
   DELETE FROM users;
   INSERT INTO users SELECT * FROM _bk_20260910_users;
   COMMIT;

   users.id / runs.id 是序列生成的，还原后需重置，否则新注册会撞主键：
     SELECT setval(pg_get_serial_sequence('users','id'), (SELECT max(id)::int FROM users));
     SELECT setval(pg_get_serial_sequence('runs','id'),  (SELECT max(id) FROM runs));

   确认一切无误后清理备份：
     DROP TABLE _bk_20260910_users; DROP TABLE _bk_20260910_runs;
---------------------------------------------------------------------------- */
