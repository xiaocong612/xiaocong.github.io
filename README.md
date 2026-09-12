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

标题可以包含冒号等常见中文标点，脚本会生成有效的 YAML 元数据。Decap CMS 中编辑的首页副标题会同步显示在首页；文章阅读时长会按中文字符和非中文单词分别估算。

## 本地预览与站点路径

本仓库发布的是 GitHub Pages 项目站点，正式地址为 `https://xiaocong612.github.io/xiaocong.github.io/`。因此 `_config.yml` 中的 `root` 必须保持为 `/xiaocong.github.io/`，不要为了本地访问而改成 `/`。

`npm run preview` 适合日常查看内容和版式，但不作为项目子路径的最终验收方式。项目站点的资源、导航和搜索都依赖 `/xiaocong.github.io/` 前缀；仅访问 `http://localhost:4000/` 无法验证这一部署形态。

要验收项目路径，先生成静态文件，再将 `public/` 临时挂载到该前缀：

```bash
npm run clean
npm run build
node -e 'const http=require("node:http");const serveStatic=require("serve-static");const finalhandler=require("finalhandler");const prefix="/xiaocong.github.io";const serve=serveStatic("public");http.createServer((request,response)=>{if(request.url==="/"){response.writeHead(302,{Location:prefix+"/"});response.end();return;}if(!request.url.startsWith(prefix+"/")){response.statusCode=404;response.end("Not found");return;}request.url=request.url.slice(prefix.length)||"/";serve(request,response,finalhandler(request,response));}).listen(4003)'
```

随后访问 `http://localhost:4003/xiaocong.github.io/`，后台地址为 `http://localhost:4003/xiaocong.github.io/admin/`。该临时服务会持续占用终端，检查结束后按 `Ctrl+C` 停止。正式发布前仍应以 GitHub Pages 上的实际地址复核一次，尤其是站内链接、搜索和图片路径。

## 发布

确认本地预览无误后执行：

```bash
npm run publish -- "更新文章"
```

脚本会先检查文章和站点，再提交并推送 `main` 分支到 `origin/main`；首次推送会建立上游分支。GitHub Actions 会自动生成 `public/` 并发布到 GitHub Pages；`public/` 不提交到源码仓库。

如果把本项目迁移到新的仓库，首次发布前需要将本地分支命名为 `main`、配置 `origin` 为目标 GitHub 仓库，并在仓库的 Pages 设置中选择 GitHub Actions。本仓库已经完成这些设置。覆盖已有远程历史属于高风险操作，只能在已确认目标仓库和覆盖范围后单独执行。

## 网页后台

访问正式站点的 `https://xiaocong612.github.io/xiaocong.github.io/admin/`，可以在浏览器中新建、编辑和发布文章，上传 `source/images/uploads` 中的图片，也可以编辑关于页和首页设置。后台与本地 Markdown 写作使用同一套文件和 Git 历史。项目路径验收时的后台地址为 `http://localhost:4003/xiaocong.github.io/admin/`。

后台登录需要部署 Cloudflare Worker：

1. 创建 GitHub OAuth App，回调地址填写 `https://你的-worker域名/callback`。
2. 按 `worker/README.md` 部署 Worker，并设置 `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET` 两个密钥。
3. 将 Worker 的公开根地址写入 `source/admin/config.yml` 的 `base_url`，并保持 `auth_endpoint: auth`。
4. 确认 Worker 的 `CMS_ORIGIN` 为 `https://xiaocong612.github.io`。这是来源地址，不能附加项目路径或 `/admin/`。本仓库的 GitHub Pages 已使用 GitHub Actions 发布。

如果在 GitHub 授权页选择取消，或 GitHub 暂时无法交换令牌，后台会收到中文错误提示并结束登录弹窗；无需手动清理残留窗口。

## 内容安全

- Markdown 渲染会净化不安全的 HTML 和链接，阻止脚本、事件处理属性与 `javascript:` 链接进入文章页面。
- 搜索结果使用安全的 DOM 文本节点渲染，并只接受站内路径，避免索引内容把读者带往不受信任的地址。
- CMS 的 OAuth 授权范围固定为 GitHub 的 `public_repo`，Worker 不接受浏览器扩大授权范围；OAuth 密钥和真实 Worker 地址不得提交到仓库。
- 根目录 `.gitignore` 已忽略本地环境变量、私钥和证书文件；不要用 `git add -f` 强行加入这些文件。

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
npm run build
git diff --check
```

当前自动化测试共 36 项。提交或发布前应依次完成以上检查。

所有站点文案、文章和说明文档均使用中文；命令、路径、配置键和第三方产品名保留原格式，便于直接执行或检索。
