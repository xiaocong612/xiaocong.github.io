# 自然主题首页与代码框实施计划

> 本计划在当前工作区内执行，不改动发布和 CMS 认证配置。

**目标：** 以已审核的山湖原创图重做首页首屏和内容布局，并让文章代码块获得接近参考站点的深色彩色语法、语言标识、行号、复制和折叠能力。

**架构：** 保留 Hexo 输出的安全 `<pre><code>`，浏览器端用本地托管的 highlight.js 着色并增强交互。首页由现有 EJS 数据渲染，少量脚本负责入场和标题动效；无脚本、减少动效偏好下仍能阅读与导航。

**技术栈：** Hexo 8、EJS、Stylus、浏览器原生 JavaScript、highlight.js、Node 测试。

## 约束

- 不关闭 `marked.dompurify`，不启用 Hexo 的 `syntax_highlighter`。
- 已批准的山湖图仅作首页主视觉及无封面文章的默认视觉，不使用未批准的城市图或森林图。
- 页面不依赖第三方 CDN；图标优先使用现有符号或简洁 CSS，无需 iconfont 下载。
- 不改动 Decap CMS 的文章字段和发布流程，不推送远程仓库。

## 任务

### 任务一：首页主视觉和内容层级

**文件：** `themes/apple-journal/layout/index.ejs`、`themes/apple-journal/source/css/style.styl`、主题图片资源、首页脚本、首页构建测试。

1. 写构建产物测试：首屏具有已批准背景、文章主区和可用的锚点入口；运行确认因缺失而失败。
2. 将候选图转成适合网页的 4K WebP，放入主题资源目录；调整首页为全幅自然首屏、简明文章导览及近期文章区，保持原有内容来源。
3. 实现首屏轻微入场/滚动动效和减少动效降级；运行首页测试与完整构建。

### 任务二：文章代码框

**文件：** `themes/apple-journal/layout/layout.ejs`、主题 CSS、`themes/apple-journal/source/js/code-blocks.js`、本地 highlight.js 资源、代码块交互测试。

1. 写代码块 DOM 测试，覆盖语言识别、语法着色、行号、复制、折叠和未知语言；运行确认因缺失而失败。
2. 本地提供 highlight.js，保留 Hexo 安全渲染，在浏览器对标准 `<pre><code>` 增强；实现参考代码框的深色外观、彩色 token 与工具栏。
3. 验证无脚本可读、手机端横向滚动、剪贴板失败反馈与键盘可操作性。

### 任务三：整体验收

1. 运行 `npm test`、`npm run check`、`git diff --check`，确认构建产物保留 fenced 代码与后台资源。
2. 启动本地预览，检查桌面和手机的首页与文章页截图、溢出和交互。
3. 更新 `docs/项目进度.md`，说明本次完成范围、预览地址和未发布状态。
