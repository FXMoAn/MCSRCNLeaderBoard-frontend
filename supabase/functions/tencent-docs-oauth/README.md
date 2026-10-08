# 腾讯文档授权

当前项目账号使用开发者后台直接提供的 `access_token` / `open_id`，接入见
`../tencent-docs-preview/README.md`。两项直接凭据配置后，本函数关闭授权入口。
以下 OAuth 实现仅保留用于取得 Client Secret 的第三方应用，本项目当前不走此流程。

本函数仅接入授权，不读写榜单、成绩或腾讯表格内容。后续同步使用网站审核后的榜单，
不会自动反向导入文档，也不在授权时启动定时任务。

1. 函数通过授权链接的 `redirect_uri` 参数传入以下 HTTPS 回调：
   `https://wdkxjftlgidebtczszsq.supabase.co/functions/v1/tencent-docs-oauth/callback`。
   不要求在没有该字段的腾讯应用后台寻找同名设置；如腾讯实际提示域名白名单错误，
   再按平台提供的入口处理。
2. 在 Supabase Edge Functions Secrets 保存 `TENCENT_DOCS_CLIENT_SECRET`。
   Client ID 已配置，密钥不可使用 `VITE_` 前缀或提交 Git。
3. 由后台生成随机 32 字节 base64url 的 setup 值，仅将其 SHA-256 十六进制摘要
   写入 `tencent_docs_private.oauth_setups`，有效期建议 30 分钟。
4. 用户亲自打开 `/start?setup=<原始随机值>`，在同一浏览器完成腾讯授权。

`/status` 仅显示配置是否齐全、Client ID 和回调地址，不返回授权令牌。
没有 Client Secret 时，授权入口关闭。一次性入口先校验 setup；回调还校验一次性
state 和 `HttpOnly; Secure; SameSite=Lax` 浏览器 cookie，最多 10 分钟内有效。
打开链接只建立授权请求；仅有效授权码回调通过浏览器校验时，才原子消耗 setup 和 state。
重复打开复用本浏览器的随机 cookie，链接预览不会提前消耗 setup。
数据库 RPC 仅供 service_role 执行；私有表启用 RLS，不授予网页用户任何权限。

Token 使用 AES-256-GCM 加密后保存，密钥通过 HKDF-SHA256 从 Client Secret 派生，
每次随机 IV，并绑定 Client ID / Open ID。不要打印 OAuth URL、Token 或提供商异常。
更换 Client Secret 后须重新授权，旧加密数据无法使用新密钥解密。

腾讯要求授权链接固定 `scope=all`，应用后台应只申请
`scope.sheet.editable`、`scope.sheet.readonly`、`scope.file.queryable`；回调核对三项。

参考：[发起授权](https://docs.qq.com/open/document/app/oauth2/authorize.html)、
[获取 Token](https://docs.qq.com/open/document/app/oauth2/access_token.html)、
[Supabase 函数密钥](https://supabase.com/docs/guides/functions/secrets)。
