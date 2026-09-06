# GitHub OAuth Worker

这个 Worker 只为 `/admin/` 的 Decap CMS 提供 GitHub OAuth 登录回调。它不保存文章、用户资料或访问令牌，GitHub 客户端密钥只从 Cloudflare Secret 读取。

## 部署前准备

1. 在 GitHub 创建 OAuth App。
2. 将授权回调地址设置为 `https://你的-worker域名/callback`。
3. 复制本目录的 `wrangler.toml.example` 为本地配置，并填写 CMS 的公开地址。
4. 在 `source/admin/config.yml` 中把 `auth_endpoint` 改成 Worker 的 `/auth` 地址。

## 部署命令

在 `worker` 目录执行：

```bash
npm install
npx wrangler login
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler deploy
```

部署完成后，把 GitHub OAuth App 的回调地址、CMS 配置中的 Worker 地址和 `CMS_ORIGIN` 三处保持完全一致。`REPO_OWNER` 与 `REPO_NAME` 保留为博客仓库信息，便于后续扩展权限检查。

## 安全约束

- 只允许 `CMS_ORIGIN` 配置的来源。
- OAuth `state` 使用客户端密钥签名，并限制有效期为十分钟。
- 只接受 GET 的 `/auth` 和 `/callback` 请求。
- 访问令牌只在回调弹窗通过 `postMessage` 交给 CMS，不写入日志或响应头。
