---
title: 欢迎来到小聪的记录
description: 这是博客的第一篇文章，之后会记录技术、学习与生活中的片段。
date: 2026-09-06 09:00:00
categories:
  - 随笔
tags:
  - 博客
---
欢迎来到 **小聪的记录**。

这里会记录技术实践、学习过程，以及生活中值得留下来的片段。博客使用 Markdown 写作，文章会在本地编辑，也可以通过网页后台更新。

## 写作与发布

### 新建文章

``` bash
$ npm run post -- "我的新文章"
```

文章会生成在 `source/_posts` 目录中，可以使用 Obsidian、Typora 或 VS Code 编辑。

### 本地预览

``` bash
$ npm run preview
```

预览确认无误后，再提交并发布到线上。

### 检查站点

``` bash
$ npm run check
```

这个命令会检查配置并生成静态页面，但不会发布。

### 发布文章

``` bash
$ npm run publish -- "发布第一篇中文文章"
```

发布后，GitHub Actions 会自动构建并更新博客。
