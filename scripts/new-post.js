const fs = require('node:fs');
const path = require('node:path');

function pad(value) {
  return String(value).padStart(2, '0');
}

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function safeSlug(title) {
  const normalized = title
    .normalize('NFKC')
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return normalized || '未命名文章';
}

function createPost({ title, rootDir = process.cwd(), date = localDate() }) {
  if (!title || !String(title).trim()) {
    throw new Error('请提供文章标题，例如：npm run post -- "我的新文章"');
  }

  const postsDir = path.join(rootDir, 'source', '_posts');
  fs.mkdirSync(postsDir, { recursive: true });
  const baseName = `${date.slice(0, 10)}-${safeSlug(String(title))}`;
  let filePath = path.join(postsDir, `${baseName}.md`);
  let suffix = 2;
  while (fs.existsSync(filePath)) {
    filePath = path.join(postsDir, `${baseName}-${suffix}.md`);
    suffix += 1;
  }

  const content = `---
title: ${String(title).trim()}
description:
date: ${date}
categories:
  - 随笔
tags:
cover:
pinned: false
draft: false
---

<!-- 在这里写文章正文。完成后运行 npm run check。 -->
`;
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

if (require.main === module) {
  try {
    const filePath = createPost({ title: process.argv.slice(2).join(' ') });
    console.log(`已创建文章：${path.relative(process.cwd(), filePath)}`);
  } catch (error) {
    console.error(`创建文章失败：${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { createPost, safeSlug };
