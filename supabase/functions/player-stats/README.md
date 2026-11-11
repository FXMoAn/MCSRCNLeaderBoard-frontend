# 个人主页公开游戏统计

`GET /functions/v1/player-stats/{本站用户ID}/{paceman|ranked}`。
Paceman 接受 `range=session|day|week|month`；Ranked 不接受查询参数。
只查询已存在的本站玩家，使用数据库绑定的 IGN / UUID，不接受任意地址或玩家名。

浏览器使用本站 `/api/player-stats/...`。Vite 开发代理直连本函数；Vercel rewrite 先到 `api/player-stats.js`，再读取本函数。
Vercel API rewrite 必须位于 SPA fallback 前。请求不携带登录凭据；响应只含卡片消费的公开统计。
薄转发不传递访客 Cookie/Auth，也不透传上游 Set-Cookie。实测 Supabase 网关的防护 Cookie 会使直接 rewrite 始终 MISS，必须过滤后才能缓存。

## 缓存与刷新

- Paceman session/day/week/month 分别为 60/120/300/600 秒；Ranked 为 180 秒。
- 数据库缓存位于私有 schema `mcsrcn_player_stats`，RLS 开启。只有 `service_role` 可访问表和三个 RPC，普通客户端无法修改缓存、锁和预算。
- 通过 20 秒租约合并跨实例的刷新；成功写入必须持有尚未到期的租约。HTTP 请求在数据库事务之外执行。
- 共享上游预算为 Paceman 120 次/分钟、Ranked 360 次/10分钟，低于目前官方上限。429 的 Retry-After 同时应用于单条缓存与整个提供方。
- Ranked 主接口出现网络错误或 5xx 时，最多切换一次官方备用接口；每次刷新提前预留两次请求预算，429 和正常的不存在玩家响应不触发切换。
- 失败保留最后成功值，30 秒后允许再次尝试；不存在用户为 60 秒；429 使用上游等待时间。最后成功数据超过 24 小时后不再展示。
- 有旧数据时立即返回，由 `EdgeRuntime.waitUntil` 后台刷新；没有旧数据时等待第一次请求。只有数据通过共享格式校验后才写入。
- 浏览器最多持久化 40 份结果、合并并发请求、以服务端绝对时间判断新鲜度。身份或范围变更后忽略旧请求结果。
- 有旧数据且没有错误时，页面最多补读两次后台刷新结果；出错即停止，不无限轮询。打开超过 24 小时的页面也会移除超龄旧数据。

## CDN

成功数据返回 `Cache-Control: public, max-age=0, must-revalidate`，配合
`Vercel-CDN-Cache-Control` 仅在 CDN 缓存最多 60 秒、后台更新窗口 30 秒。
旧数据的 CDN 缓存缩短为 5 秒。错误不进入 CDN；不对整个个人主页或登录接口设置公共缓存。

## 运行与发布

无需新增第三方密钥。函数只使用 Supabase 自带的 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`，不会将其发送给浏览器。

1. 应用 `add_shared_player_stats_cache` 迁移。
   接着应用 `reserve_ranked_failover_budget`，为主备切换预留预算。
2. 部署 `player-stats`，包含 `shared/player-stats.ts` 与函数目录内依赖。
3. 发布前端及 `vercel.json`，检查两个公开 GET 的响应和 `x-vercel-cache: HIT`。

2026-11-11 专用 API 预览已确认：Ranked 为 MISS → HIT；Paceman 为 MISS → STALE → HIT，两者 HTTP 200，均不带 Set-Cookie。
该预览仅验证 API 路由与 CDN；完整页面在本地开发服务确认。正式前端仍待用户确认后发布。

回退前端即可恢复旧请求链路；新增的缓存表与函数不写入用户、成绩或腾讯文档同步表。
离线/异常/限流/旧数据保护等回归用例：`npm run test:player-stats`（Node 22.18+ 或 24）。
