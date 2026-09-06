# 小聪的记录

这是一个使用 Hexo 构建的中文个人博客，内容包括技术实践、学习记录和生活随笔。主题采用克制、留白和清晰层级的 Apple 风格设计，支持浅色与系统深色模式。

## 本地写作

环境要求：Node.js 20 或更高版本。

```bash
npm install
npm run post -- "文章标题"
npm run preview
npm run check
```

`npm run post` 会在 `source/_posts` 生成带有中文元数据的文章模板。文章分类固定为 `技术`、`学习`、`随笔`，标题、日期、分类和正文必须填写。

## 发布

确认本地预览无误后执行：

```bash
npm run publish -- "更新文章"
```

脚本会先检查文章和站点，再提交并推送当前分支。GitHub Actions 会自动生成 `public/` 并发布到 GitHub Pages；`public/` 不提交到源码仓库。

## 网页后台

访问站点的 `/admin/`，可以在浏览器中新建、编辑和发布文章，上传 `source/images/uploads` 中的图片，也可以编辑关于页和首页设置。后台与本地 Markdown 写作使用同一套文件和 Git 历史。

后台登录需要部署 Cloudflare Worker：

1. 创建 GitHub OAuth App，回调地址填写 `https://你的-worker域名/callback`。
2. 按 `worker/README.md` 部署 Worker，并设置 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET` 两个密钥。
3. 将 Worker 的公开地址写入 `source/admin/config.yml` 的 `auth_endpoint`。
4. 确认 Worker 的 `CMS_ORIGIN` 为 `https://xiaocong612.github.io`，再在 GitHub 仓库设置 Pages 使用 GitHub Actions。

## 目录说明

- `source/_posts`：博客文章。
- `source/about`：关于页。
- `source/images/uploads`：后台和本地共用的图片目录。
- `source/admin`：Decap CMS 后台。
- `themes/apple-journal`：博客主题。
- `worker`：GitHub OAuth Cloudflare Worker。
- `.github/workflows`：检查和 Pages 发布流程。

## 常用检查

```bash
npm test
npm run check
git diff --check
```

所有站点文案、文章和说明文档均使用中文；命令、路径、配置键和第三方产品名保留原格式，便于直接执行或检索。
