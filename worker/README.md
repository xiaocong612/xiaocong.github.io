# GitHub OAuth Worker

这个 Worker 只为 `/admin/` 的 Decap CMS 提供 GitHub OAuth 登录回调。它不保存文章、用户资料或访问令牌，GitHub 客户端密钥只从 Cloudflare Secret 读取。

## 部署前准备

1. 在 GitHub 创建 OAuth App。
2. 将授权回调地址设置为 `https://你的-worker域名/callback`。
3. 复制本目录的 `wrangler.toml.example` 为本地配置，并填写 CMS 的公开地址。
4. 在 `source/admin/config.yml` 中把 `base_url` 改成 Worker 的公开根地址，并保持 `auth_endpoint: auth`。

## 部署命令

在 `worker` 目录执行：

```bash
npm install
npx wrangler login
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler deploy
```

部署完成后，分别检查下面三个不同用途的地址：

- GitHub OAuth App 的「Authorization callback URL」填写 `https://你的-worker域名/callback`。
- `source/admin/config.yml` 的 `base_url` 填写 `https://你的-worker域名`，`auth_endpoint` 保持为 `auth`。Decap 会将两者拼成 Worker 的 `/auth` 地址。
- Worker 的 `CMS_ORIGIN` 填写博客后台所在站点的来源，例如 `https://xiaocong612.github.io`，不要附加 `/admin/` 或路径。

`REPO_OWNER` 与 `REPO_NAME` 仅保留博客仓库信息，便于后续扩展权限检查；当前 GitHub OAuth 授权本身不能把令牌限制到单一仓库。

## 安全约束

- 只允许 `CMS_ORIGIN` 配置的来源。
- OAuth `state` 使用客户端密钥签名，并限制有效期为十分钟。
- 只接受 GET 的 `/auth` 和 `/callback` 请求。
- 访问令牌只在回调弹窗通过 `postMessage` 交给 CMS，不写入日志或响应头。
- 公开博客仓库固定请求 GitHub 的 `public_repo` 权限；Worker 忽略浏览器传入的 `scope` 参数，避免请求被扩大。该权限仍可访问用户有权操作的公开仓库，GitHub OAuth 不支持把令牌限定为某一个仓库。

如果博客仓库改为私有仓库，`public_repo` 无法满足后台写入需求。此时需要在充分了解影响后，主动改为 GitHub 的 `repo` 权限并重新审查授权范围。
