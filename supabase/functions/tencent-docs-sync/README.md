# 网站成绩 → 腾讯文档

本服务将网站两个 RSG 榜单中**每位玩家最好的一条已审核成绩**同步到同一份腾讯文档的新页。玩家以 `users.id` 区分，记录以 `runs.id` 绑定；PB 选择和排名沿用网站 `get_leaderboard` 的 `igt` **文本排序**，本次不调整网站的排序规则。同一玩家同成绩有多条记录时，优先保留已有绑定；没有可确认绑定则停止该次同步。

| 网站分类 | 原始页（只读保留） | 自动页（写入目标） |
|---|---|---|
| 1.16.1 / RSG | `BB08J2`：1.16+RSG | `jhWh54`：网站同步·1.16+RSG |
| 1.15.2 / RSG | `BB08J3`：1.13-1.15 RSG | `52LLG6`：网站同步·1.13-1.15 RSG |

自动页有 1000 行、9 列，前两行是标题和表头，最多容纳 **998 位玩家**。达到容量上限会停止写入，不会截断成绩或自行扩容。请把手工说明继续写在原始页；自动页的值发生手工改动时，服务会报告冲突并停止覆盖。

2026-10-08 已启用自动同步，定时任务 `mcsrcn-tencent-docs-sync` 每分钟执行。启用验收时两页实际请求均成功：北京时间 11:54:58 / 11:56:05；`enabled=true`，两组 generation 11 / 9 均已完成，`dirty=false`，无错误。这是当时的验收结果，当前运行状态请查 `docs_sync_state()`。

## 数据与备份边界

- 独立轮询只读取 `public.runs`、`public.users` 的已审核成绩，变化队列、运行状态和结构快照保存在私有 `mcsrcn_docs_sync` schema。不会修改业务表的行、RLS、已有函数或触发器，也不会把网络调用放进成绩审核事务。
- 只写上表中的两个自动页。原始页和其他页不删除、不改名、不重排，也不会清理原页的重复玩家、旧成绩或错误时间。
- 原文档备注、路线/打法放在自动页的独立列。只有当前 `videolink` 中的视频、精确到毫秒的成绩及日期唯一对应同一历史 `run_id` 时，才自动带入；忽略过期的缓存 `bvid`。缺视频、缺毫秒精度、冲突或多重匹配不猜，原内容仍留在原页。新 PB 不继承旧成绩的专属备注。
- 腾讯原生文件复制接口实际返回权限错误 `10007`，**没有生成原生文档副本**。保护措施是保留原页，并将原始 `CellData`、格式、超链接、元数据及后续写入前后状态保存为私有结构快照；这不等同于完整复制腾讯的编辑历史或附件。
- 写入前保存预期内容并重读目标页，写入后再读取核对；超时重试先判断上一次写入是否已完成。腾讯没有原子比较后写入接口，重读与写入之间仍有短暂窗口，因此自动页应交给服务维护。

## 首次准备与启用

所需服务端环境变量：`SUPABASE_URL`、Supabase 服务端密钥、`TENCENT_DOCS_ACCESS_TOKEN`、`TENCENT_DOCS_OPEN_ID`，以及可选的 `TENCENT_DOCS_CLIENT_ID`。凭据只放 Edge Function secrets，不放前端、仓库或本文。

迁移 `20261008032852_add_read_only_tencent_docs_sync.sql` 默认 `enabled=false`，不会创建 cron；独立迁移 `20261008034246_schedule_tencent_docs_read_only_sync.sql` 负责以 postgres 身份安装或更新唯一的每分钟任务。**当前两个迁移均已应用、同步已启用**，无需再次初始化或注册任务。

以下步骤仅供首次安装参考。调度迁移不会自动启用文档写入，`docs_sync_set_enabled(true)` 仍需在人工核对后单独执行；安装或恢复调度请使用该迁移，避免另行重复调用 `cron.schedule`。

1. 应用迁移并部署函数，保持同步暂停。
2. 依次调用 `/backup`、`/prepare`；每次单独申请 `prepare` nonce。`/prepare` 仅初始化自动页，并保存目标页 ID 与读回基线。
3. 人工核对两个自动页、原页保留情况及注释匹配结果，再启用；以 postgres 身份应用上述独立调度迁移，安排每分钟任务。

在 Supabase SQL Editor 以数据库管理员执行：

```sql
SELECT public.docs_sync_state();
-- 仅在两个自动页已经准备好并核对后执行：
SELECT public.docs_sync_set_enabled(true);

-- 调度由独立迁移管理；这里仅核对唯一任务。
SELECT jobid, jobname, schedule, username, active
  FROM cron.job WHERE jobname = 'mcsrcn-tencent-docs-sync';
```

运行行为：每分钟独立检查一次数据变化，只有有待处理变化时才调用 worker；一次处理一个分类，无变化不反复写文档。失败按错误类型延迟重试。

## 一次性 nonce 调用

`verify_jwt=false` 是为了让短时 nonce 请求通过 Edge 网关；处理器仍会校验 scope、有效期及是否已消费。普通用户和匿名角色不能申请 nonce，也不能调用同步管理 RPC。`GET /status` 只返回服务是否配置，不返回数据或凭据。

| POST 路径 | nonce scope | 用途 |
|---|---|---|
| `/inspect` | `inspect` | 查看私有状态及源数据 |
| `/inspect?snapshot=1` | `inspect` | 只读获取状态、源数据，以及两张原页和两张自动页的完整原始快照 |
| `/backup` | `prepare` | 保存原页结构快照，必须暂停 |
| `/prepare` | `prepare` | 准备自动页，必须暂停 |
| `/process` | `process` | 处理一次待同步任务 |

申请示例：`SELECT public.docs_sync_issue_nonce('inspect', 60);`。nonce 是 43 字符、一次性、默认 60 秒有效（允许 10–300 秒）。用返回值作为 `Authorization: Bearer <nonce>` 发送 POST；请求失败后也必须重新申请。不要在日志、聊天或版本库里保存 nonce。

调度函数 `mcsrcn_docs_sync.dispatch()` 会自行申请短时 `process` nonce，并通过 `pg_net` 调用固定的 worker 地址，无需在 cron 中保存长期服务密钥。

## 暂停、恢复与排查

```sql
-- 暂停新任务及续租；正在进行的 HTTP 请求可能仍会结束。
SELECT public.docs_sync_set_enabled(false);
SELECT public.docs_sync_state();

-- 核对冲突和目标页后恢复；保留原队列与快照。
SELECT public.docs_sync_set_enabled(true);
-- 必要时主动标记两页需要重新同步，并立即调度一次。
SELECT public.docs_sync_requeue();
SELECT mcsrcn_docs_sync.dispatch();

-- 查看原始组对应的最近结构快照。
SELECT public.docs_sync_backups('BB08J2', 5);
SELECT public.docs_sync_backups('BB08J3', 5);
```

`docs_sync_state()` 可查看 `last_error`、`next_attempt_at`、`last_success_at`、`dirty`、`lease_until` 及 `has_write_intent`。调整配置前先暂停，并等待活动租约结束；不要删除队列、快照或未完成写入记录来消除报错。

遇到 `managed_page_changed`、`concurrent_document_edit`、`pending_write_conflict` 时，保留人工修改并核对前后快照，不直接把当前页当作新基线覆盖。遇到 `ambiguous_best_time_*` 或容量错误时，先处理绑定/容量问题再恢复。仅重新排队不能解决这些冲突。停用定时任务可用 `SELECT cron.unschedule('mcsrcn-tencent-docs-sync');`；这不会删除原页、自动页或私有快照。
