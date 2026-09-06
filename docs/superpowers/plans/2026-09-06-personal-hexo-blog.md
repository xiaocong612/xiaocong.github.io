# 个人 Hexo 博客实施计划

> **给执行代理的要求：** 必须按任务逐项执行，并在每个任务结束后运行对应验证。推荐使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans` 在本会话中按检查点执行。

**目标：** 将当前默认 Hexo 项目改造成中文 Apple 风格个人博客，提供本地 Markdown 优先发布流程、完整 Decap CMS 后台、GitHub Pages 自动部署，以及 Cloudflare Worker GitHub OAuth 回调。

**架构：** `main` 分支保存 Hexo 源码，GitHub Actions 负责生成并发布 Pages。项目内的 `themes/apple-journal` 负责全部页面与样式；`source/admin` 提供 Decap CMS；文章和图片始终以 Markdown 与静态资源形式保存在仓库中。本地脚本与 CMS 写入相同文件，确保两种发布方式拥有一致的内容模型和 Git 历史。

**技术栈：** Hexo 8、EJS、Stylus、Node.js 脚本、Decap CMS、GitHub Actions、GitHub Pages、Cloudflare Workers。

## 全局约束

- 所有站点可见文案、文章、模板、说明文档和后台标签均使用中文；代码命令、配置键名和第三方 API 字段保留英文原名。
- 视觉语言为原创 Apple 风格：明亮留白、细致层级、低饱和强调色、圆角和轻阴影；不得复制 Apple 品牌、商标、专有字体、图片或页面文案。
- 文章分类固定为 `技术`、`学习`、`随笔`；标题、日期、分类和正文必填，摘要、标签、封面、置顶和草稿状态可选。
- `public/`、`node_modules/`、`.deploy*/`、`.superpowers/` 和构建缓存不得提交。
- `main` 保存源码；不得使用 `hexo-deployer-git` 将生成目录强推回源码分支。
- 不把 GitHub OAuth 客户端密钥、Cloudflare 密钥或个人凭据写入仓库。
- 页面必须通过桌面和手机尺寸验证，文字不得溢出，交互元素不得重叠。

---

### 任务 1：整理源码配置与中文内容模型

**文件：**
- 修改：`_config.yml`
- 修改：`package.json`
- 修改：`scaffolds/post.md`
- 修改：`scaffolds/page.md`
- 修改：`scaffolds/draft.md`
- 修改：`source/_posts/hello-world.md`
- 创建：`source/about/index.md`
- 创建：`source/_data/settings.yml`
- 创建：`source/images/uploads/.gitkeep`

**接口：**
- 产出站点配置键：`title`、`subtitle`、`author`、`language`、`url`、`theme`、`permalink`、`index_generator`。
- 产出文章字段：`title`、`description`、`date`、`categories`、`tags`、`cover`、`pinned`、`draft`。
- 后续主题和 CMS 以这些字段名为唯一来源。

- [ ] **步骤 1：先写配置验证脚本的失败用例**

在 `scripts/check-site.js` 中定义检查入口 `checkSite({ rootDir })`，但先让它对当前重复 `deploy` 配置和英文默认元数据返回非零结果。错误必须列出文件路径和具体字段。

- [ ] **步骤 2：运行失败验证**

运行：`node scripts/check-site.js`

预期：失败，并指出 `_config.yml` 存在重复 `deploy` 或必需站点字段仍是默认值。

- [ ] **步骤 3：修改 Hexo 配置**

删除重复的 `deploy` 配置和 `hexo-deployer-git` 发布段；设置中文站点信息、`language: zh-CN`、`theme: apple-journal`、`url: https://xiaocong612.github.io`、中文日期格式和分类默认值。配置中所有注释也使用中文。

- [ ] **步骤 4：更新中文脚手架和内容**

让 `scaffolds/post.md` 生成中文 front matter 与中文提示注释，默认分类为 `随笔`；将欢迎文章改成中文并包含本地写作、预览、检查、发布命令；新增中文关于页和站点设置数据文件。

- [ ] **步骤 5：扩展 package scripts**

保留 `build`、`clean`、`server`，新增：

```json
{
  "post": "node scripts/new-post.js",
  "preview": "hexo server",
  "check": "node scripts/check-site.js",
  "publish": "node scripts/publish.js"
}
```

- [ ] **步骤 6：重新运行验证**

运行：`node scripts/check-site.js`

预期：配置解析通过，缺少主题文件前只报告主题目录尚未创建，不再报告重复 YAML 键或英文默认站点字段。

- [ ] **步骤 7：提交任务变更**

```powershell
git add _config.yml package.json scaffolds source scripts
git commit -m "feat: establish Chinese blog content model"
```

### 任务 2：实现中文本地写作与发布辅助脚本

**文件：**
- 创建：`scripts/new-post.js`
- 创建：`scripts/check-site.js`
- 创建：`scripts/publish.js`
- 创建：`scripts/validate-posts.js`
- 创建：`test/scripts.test.js`

**接口：**
- `new-post.js` 接受 `npm run post -- "标题"`，生成 `source/_posts/YYYY-MM-DD-标题.md`。
- `validate-posts.js` 导出 `validatePosts({ sourceDir })`，返回 `{ valid, errors }`。
- `check-site.js` 导出 `checkSite({ rootDir })`，校验 YAML、文章元数据并调用 Hexo 生成。
- `publish.js` 接受可选提交说明，先调用 `checkSite`，再检查 Git 工作区、提交变更并推送当前分支。

- [ ] **步骤 1：写失败测试**

测试至少覆盖：标题生成文件名、缺少分类时报错、非法分类时报错、正常文章通过、检查失败时发布脚本不执行 `git commit`。

- [ ] **步骤 2：运行测试确认失败**

运行：`node --test test/scripts.test.js`

预期：因脚本入口和校验函数尚未实现而失败。

- [ ] **步骤 3：实现文章生成**

使用 Node.js `fs` 和 `path`，不依赖字符串拼接命令。标题为空时退出并显示中文提示；文件名使用安全 slug，正文保留中文标题和中文 front matter。

- [ ] **步骤 4：实现元数据校验**

使用 Hexo 的配置加载结果和文章解析能力；校验标题、日期、分类、正文，限制分类值为 `技术`、`学习`、`随笔`，发现问题时按文件聚合中文错误。

- [ ] **步骤 5：实现站点检查与发布**

`check-site.js` 先执行元数据校验，再执行 `hexo clean` 与 `hexo generate`。`publish.js` 在检查失败时退出；检查通过后用 `spawnSync` 调用 Git，提交说明为空时使用中文默认说明。推送失败时保留本地提交并给出中文恢复提示。

- [ ] **步骤 6：运行测试与构建**

运行：`node --test test/scripts.test.js`、`npm run check`

预期：测试通过，站点检查成功生成 `public/`。

- [ ] **步骤 7：提交任务变更**

```powershell
git add scripts test package.json
git commit -m "feat: add local writing and publishing commands"
```

### 任务 3：创建 Apple 风格 Hexo 主题

**文件：**
- 创建：`themes/apple-journal/_config.yml`
- 创建：`themes/apple-journal/layout/layout.ejs`
- 创建：`themes/apple-journal/layout/index.ejs`
- 创建：`themes/apple-journal/layout/post.ejs`
- 创建：`themes/apple-journal/layout/page.ejs`
- 创建：`themes/apple-journal/layout/archive.ejs`
- 创建：`themes/apple-journal/layout/category.ejs`
- 创建：`themes/apple-journal/layout/tag.ejs`
- 创建：`themes/apple-journal/layout/_partial/header.ejs`
- 创建：`themes/apple-journal/layout/_partial/footer.ejs`
- 创建：`themes/apple-journal/layout/_partial/article.ejs`
- 创建：`themes/apple-journal/layout/_partial/post-meta.ejs`
- 创建：`themes/apple-journal/layout/_partial/search.ejs`
- 创建：`themes/apple-journal/layout/_partial/toc.ejs`
- 创建：`themes/apple-journal/source/css/style.styl`
- 创建：`themes/apple-journal/source/js/search.js`
- 创建：`themes/apple-journal/languages/zh-CN.yml`
- 创建：`themes/apple-journal/source/css/images/featured-journal.jpg`

**接口：**
- 所有布局通过 Hexo 的 `page`、`post`、`site`、`theme` 数据渲染。
- 首页选择 `pinned: true` 的最新文章作为精选，否则选择最新文章。
- 主题输出 `/search.json` 所需的搜索数据和可访问的导航链接。

- [ ] **步骤 1：先建立最小失败构建**

创建主题配置和布局骨架，故意让首页模板引用一个待实现的局部，并运行 `npm run check`，确认错误来自主题缺失局部而不是站点配置。

- [ ] **步骤 2：实现全局布局和中文导航**

完成页面语言、响应式 viewport、主题色、跳过导航链接、站点标题、首页/归档/关于/搜索入口和页脚版权信息。

- [ ] **步骤 3：实现精选首页**

使用一个原创封面图作为精选背景或媒体区域，精选文章显示标题、摘要、分类和日期；文章流显示分类、标题、摘要、标签和阅读入口。卡片圆角不超过 8px，页面分区使用全宽布局而非卡片嵌套。

- [ ] **步骤 4：实现文章、归档、分类、标签和关于页**

文章页提供单栏阅读宽度、目录、代码块、图片、上一篇/下一篇和复制链接；归档和分类页支持混合内容筛选；关于页读取 `source/about/index.md`。

- [ ] **步骤 5：实现本地搜索与深色模式**

生成 JSON 搜索索引，在浏览器本地过滤标题、摘要、分类和标签；使用 CSS 媒体查询支持系统深色模式，并保证中文文字在两种配色下的对比度。

- [ ] **步骤 6：运行构建与浏览器检查**

运行：`npm run check`。启动：`npm run preview`。检查桌面 1440px 与手机 390px 首页、文章页、归档页，确认中文无溢出、导航可用、精选封面加载、深色模式不重叠。

- [ ] **步骤 7：提交任务变更**

```powershell
git add themes source
git commit -m "feat: add Apple-inspired Chinese journal theme"
```

### 任务 4：加入 Decap CMS 中文后台

**文件：**
- 创建：`source/admin/index.html`
- 创建：`source/admin/config.yml`
- 创建：`source/admin/preview.css`
- 修改：`source/_data/settings.yml`
- 修改：`source/about/index.md`

**接口：**
- `/admin/` 加载 Decap CMS。
- `config.yml` 的 `posts` 集合写入 `source/_posts`，字段名与任务 1 的 front matter 完全一致。
- `media_folder` 为 `source/images/uploads`，`public_folder` 为 `/images/uploads`。
- 后台集合包含文章、关于页和站点设置。

- [ ] **步骤 1：写配置检查测试**

在 `test/cms-config.test.js` 中读取 YAML，断言后台入口存在、文章集合路径正确、分类枚举为三种中文分类、媒体目录正确。

- [ ] **步骤 2：运行测试确认失败**

运行：`node --test test/cms-config.test.js`

预期：因 `/admin/` 文件和配置不存在而失败。

- [ ] **步骤 3：实现中文 CMS 配置**

使用 GitHub 后端的占位 OAuth 回调地址环境值，避免把密钥写入仓库；所有 label、hint、按钮辅助文案使用中文。文章正文使用 Markdown 编辑器，支持草稿和摘要字段。

- [ ] **步骤 4：实现 CMS 预览样式**

让后台预览使用与主题相同的字体、颜色、文章宽度、代码块和标题层级，保持中文文章写作时的最终观感。

- [ ] **步骤 5：运行 CMS 配置测试**

运行：`node --test test/cms-config.test.js`

预期：配置结构、字段、媒体路径和中文分类全部通过。

- [ ] **步骤 6：提交任务变更**

```powershell
git add source/admin source/_data/settings.yml source/about test/cms-config.test.js
git commit -m "feat: add Chinese Decap CMS workflow"
```

### 任务 5：配置 GitHub Pages 自动发布

**文件：**
- 创建：`.github/workflows/pages.yml`
- 创建：`.github/workflows/validate.yml`
- 修改：`package-lock.json`（仅在依赖变更时自动更新）

**接口：**
- `pages.yml` 在 `main` 推送、手动触发和每小时定时触发。
- 工作流安装 Node.js 依赖，执行 `npm run check`，上传 `public/`，使用官方 Pages artifact/deploy actions 发布。
- `validate.yml` 对拉取请求执行相同检查，不发布站点。

- [ ] **步骤 1：创建最小工作流并做静态检查**

为两个工作流写入固定 Node.js 版本、`permissions`、并发策略和中文步骤名称；动作版本使用当前稳定主版本。

- [ ] **步骤 2：本地验证 YAML**

运行：`npm run check`，并用 Node.js YAML 解析器读取两个工作流，确认没有重复键、空发布路径或缺少权限。

- [ ] **步骤 3：确认 Pages 产物策略**

确保 workflow 不执行 `hexo deploy`，只将 `public/` 作为 artifact 发布；构建失败时后续上传与部署步骤不会执行。

- [ ] **步骤 4：提交任务变更**

```powershell
git add .github/workflows
git commit -m "ci: publish Hexo site with GitHub Pages"
```

### 任务 6：准备 Cloudflare Worker GitHub OAuth

**文件：**
- 创建：`worker/package.json`
- 创建：`worker/src/index.js`
- 创建：`worker/wrangler.toml.example`
- 创建：`worker/README.md`
- 修改：`source/admin/config.yml`

**接口：**
- Worker 接受 `GET /auth` 与 `GET /callback`，使用环境变量 `GITHUB_CLIENT_ID`、密钥 `GITHUB_CLIENT_SECRET`、`CMS_ORIGIN`、`REPO_OWNER`、`REPO_NAME`。
- Worker 仅向已配置的 CMS 来源返回 Decap 所需的授权消息，不保存文章或用户数据。
- `wrangler.toml.example` 不包含真实域名密钥，README 用中文列出部署和 GitHub OAuth 回调步骤。

- [ ] **步骤 1：写 Worker 单元测试**

在 `test/worker.test.js` 中测试：未配置来源返回 403、未知路径返回 404、缺少 OAuth 参数返回 400、正常 callback 使用 mock GitHub 响应生成 Decap 回调 HTML。

- [ ] **步骤 2：运行测试确认失败**

运行：`node --test test/worker.test.js`

预期：因 Worker handler 尚未创建而失败。

- [ ] **步骤 3：实现来源与回调校验**

使用 Web 标准 `Request`/`Response` API；严格比较 `state`、`redirect_uri` 和 `CMS_ORIGIN`，只允许 GET；错误返回中文 JSON，不记录 access token。

- [ ] **步骤 4：实现 GitHub 代码交换**

服务端向 GitHub token endpoint 交换 code，并将一次性 token 通过 Decap 规定的 `postMessage` 回调返回给 CMS 弹窗；客户端密钥只从 Worker secret 读取。

- [ ] **步骤 5：运行 Worker 测试**

运行：`node --test test/worker.test.js`

预期：所有来源、参数、错误和 mock 成功路径通过。

- [ ] **步骤 6：提交任务变更**

```powershell
git add worker source/admin/config.yml test/worker.test.js
git commit -m "feat: add Cloudflare OAuth worker scaffold"
```

### 任务 7：整体验证、浏览器验收与首次远程发布准备

**文件：**
- 修改：`README.md`
- 修改：`.gitignore`
- 视验证结果修改：`themes/apple-journal`、`source/admin`、`.github/workflows`

**接口：**
- README 用中文说明本地写作、预览、检查、发布、后台登录和账户配置步骤。
- `.gitignore` 忽略 `.superpowers/`、`public/`、依赖、构建缓存和 Worker 本地密钥文件。

- [ ] **步骤 1：运行全部自动检查**

运行：`npm test`、`npm run check`、`git diff --check`。

预期：所有测试通过，Hexo 生成成功，工作区无空白错误。

- [ ] **步骤 2：检查生成输出**

确认 `public/index.html`、文章页、归档、分类、关于页、`admin/index.html`、搜索索引和静态资源均存在；用 `rg` 确认默认 `Hello World` 和 Landscape 文案不再出现在生成结果中。

- [ ] **步骤 3：进行浏览器验收**

启动 `npm run preview`，用桌面和手机视口检查首页精选区、文章流、文章页、搜索、归档、深色模式和 `/admin/` 入口。截图或 DOM 检查不得出现横向溢出、重叠或不可读中文。

- [ ] **步骤 4：完成中文文档检查**

检查所有项目内 `*.md` 文件：正文、标题、说明和示例均使用中文；仅保留必要的英文命令、路径、配置键和第三方产品名。

- [ ] **步骤 5：提交整体验收修正**

```powershell
git add README.md .gitignore themes source .github worker test
git commit -m "docs: document Chinese blog workflows"
```

- [ ] **步骤 6：准备首次远程覆盖推送**

在作者确认 GitHub 登录、仓库覆盖和 Pages 设置后，添加远程地址并推送 `main`。推送前再次执行 `npm run check`；不得在脚本或命令中输出任何 OAuth 密钥。

## 计划自检

- 设计说明中的本地 Markdown、中文内容、精选首页、CMS、GitHub Pages、Cloudflare OAuth、错误处理和验收要求均有对应任务。
- 没有使用 `TODO`、`TBD` 或模糊的“自行处理”步骤；每项任务都指定文件、接口、验证命令和提交边界。
- 主题使用 `pinned`、`description`、`cover` 等字段与内容模型一致；CMS、校验脚本和主题共享同一字段名。
- 发布路径统一为 GitHub Actions，不再调用 `hexo-deployer-git`；本地发布只提交源码。
