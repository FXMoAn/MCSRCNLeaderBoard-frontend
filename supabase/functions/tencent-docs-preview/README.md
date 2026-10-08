# 腾讯文档只读接入检查

本项目当前账号的开发者后台直接提供 `client_id`、`access_token`、`open_id`，
使用三项凭据从服务端调用 OpenAPI。当前接入不使用 OAuth 授权链接。

在 Supabase Edge Functions Secrets 保存 `TENCENT_DOCS_ACCESS_TOKEN`、
`TENCENT_DOCS_OPEN_ID`，Client ID 已配置。Token 到期后由账号持有人在腾讯后台重置，
再更新 Supabase Secret。不读取浏览器保存的登录凭据，不把 Token 返回网页。

`GET /status` 仅返回是否配置。`POST /inspect` 要求 `Authorization: Bearer <capability>`，
capability 为随机 32 字节的 base64url 字符串；后台仅保存 SHA-256 摘要、到期时间和
使用时间。令牌由后台生成且仅用一次，与 OAuth 的入口令牌分开。

函数固定读取文档 `DZnVPZ0JhTGVWdFZi` 的 ID、全部子表元数据、账号查看/编辑权限，
以及 `BB08J2`、`BB08J3` 的 `A1:Z5` 表头。所有腾讯请求均为 GET，不接受任意目标地址，
不跟随重定向，不返回 API 凭据，也不启用同步或定时任务。

参考：
[文件 ID 转换](https://docs.qq.com/open/document/app/openapi/v2/file/util/converter.html)、
[子表信息](https://docs.qq.com/open/document/app/openapi/v3/sheet/get/get_sheet.html)、
[范围内容](https://docs.qq.com/open/document/app/openapi/v3/sheet/get/get_range.html)、
[文档访问权限](https://docs.qq.com/open/document/app/openapi/v2/file/files/access.html)。
