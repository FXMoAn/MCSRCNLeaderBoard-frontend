-- ============================================================================
-- 合并重复玩家档案（2 组，同一 B站 mid 对上了两条 users 记录）
-- 必须在 import_20260910.sql 之后执行。
-- 顺序固定：改 runs.userid -> 删旧档案 -> 再改昵称（users_nickname_key 是唯一索引）
-- ============================================================================
BEGIN;

-- ---- A. mid=286109167：LiHaoqwq(id=228) + ltyydmydcp(id=254) ----
-- 两条成绩的视频都投在同一个 B站账号下，该账号现名 LiHaoqwq。
-- 保留 228（名字与 B站现名一致，且成绩更好 27:03.510），并入 254 的 47:10.800。
UPDATE runs SET userid = 228 WHERE userid = 254;
DELETE FROM users WHERE id = 254;
UPDATE users SET bili_id = '286109167' WHERE id = 228;

-- ---- B. mid=371717947：九黎科技(id=107) + MCjiuli(id=272) ----
-- 曾用名 MCjiuli -> 现名 九黎科技。272 挂着登录账号和 MC 身份信息，所以保 272。
UPDATE runs SET userid = 272 WHERE userid = 107;
DELETE FROM users WHERE id = 107;
UPDATE users SET nickname = '九黎科技' WHERE id = 272;
UPDATE users SET bili_id = '371717947' WHERE id = 272;

-- ---- 校验 ----
SELECT 'users 总数' AS item, count(*) AS n FROM users
UNION ALL SELECT 'runs 总数', count(*) FROM runs
UNION ALL SELECT '重名档案', (SELECT count(*) FROM (SELECT nickname FROM users GROUP BY nickname HAVING count(*)>1) a)
UNION ALL SELECT '重复bili_id', (SELECT count(*) FROM (SELECT bili_id FROM users WHERE bili_id IS NOT NULL GROUP BY bili_id HAVING count(*)>1) b)
UNION ALL SELECT '孤儿成绩', (SELECT count(*) FROM runs r WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id=r.userid))
UNION ALL SELECT '残留 254/107', (SELECT count(*) FROM users WHERE id IN (254,107))
UNION ALL SELECT '228 的成绩数', count(*) FROM runs WHERE userid = 228
UNION ALL SELECT '272 的成绩数', count(*) FROM runs WHERE userid = 272;

SELECT id, nickname, bili_id, user_id IS NOT NULL AS 有登录账号, ingamename
  FROM users WHERE id IN (228, 272);

-- 第 1 遍保持 ROLLBACK;（零变化，只看校验数字）
-- 第 2 遍把下面这行替换成 COMMIT; 才真正落库
ROLLBACK;
