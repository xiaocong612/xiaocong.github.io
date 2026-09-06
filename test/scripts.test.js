const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createPost } = require('../scripts/new-post');
const { validatePosts } = require('../scripts/validate-posts');
const { publish } = require('../scripts/publish');
const { buildSearchIndex } = require('../scripts/search-index');

function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'xiaocong-blog-'));
  fs.mkdirSync(path.join(root, 'source', '_posts'), { recursive: true });
  return root;
}

test('按标题和日期生成中文文章文件名', () => {
  const root = tempRoot();
  const filePath = createPost({ rootDir: root, title: '我的第一篇文章', date: '2026-09-06 10:00:00' });
  assert.equal(path.basename(filePath), '2026-09-06-我的第一篇文章.md');
  assert.match(fs.readFileSync(filePath, 'utf8'), /categories:\n  - 随笔/);
});

test('空标题会给出中文错误', () => {
  assert.throws(() => createPost({ rootDir: tempRoot(), title: '  ' }), /请提供文章标题/);
});

test('缺少分类时报错', () => {
  const root = tempRoot();
  fs.writeFileSync(path.join(root, 'source', '_posts', 'bad.md'), '---\ntitle: 缺分类\ndate: 2026-09-06\n---\n正文');
  const result = validatePosts({ sourceDir: path.join(root, 'source', '_posts') });
  assert.equal(result.valid, false);
  assert.match(result.errors[0].message, /categories/);
});

test('非法分类时报错', () => {
  const root = tempRoot();
  fs.writeFileSync(path.join(root, 'source', '_posts', 'bad.md'), '---\ntitle: 错分类\ndate: 2026-09-06\ncategories:\n  - 新闻\n---\n正文');
  const result = validatePosts({ sourceDir: path.join(root, 'source', '_posts') });
  assert.equal(result.valid, false);
  assert.match(result.errors[0].message, /技术、学习、随笔/);
});

test('完整中文文章可以通过校验', () => {
  const root = tempRoot();
  fs.writeFileSync(path.join(root, 'source', '_posts', 'ok.md'), '---\ntitle: 一篇文章\ndate: 2026-09-06\ncategories:\n  - 技术\ntags:\n  - Hexo\n---\n正文内容');
  const result = validatePosts({ sourceDir: path.join(root, 'source', '_posts') });
  assert.equal(result.valid, true);
});

test('站点检查失败时发布不会执行提交', () => {
  let gitCalls = 0;
  const result = publish({
    rootDir: tempRoot(),
    check: () => ({ valid: false, errors: [{ file: '文章.md', message: '缺少分类' }] }),
    runGit: () => { gitCalls += 1; return { status: 0, output: '' }; }
  });
  assert.equal(result.published, false);
  assert.equal(gitCalls, 0);
});

test('搜索索引使用站内文章地址', () => {
  const index = buildSearchIndex({
    locals: { get: () => [{
      title: '搜索文章',
      path: '2026/09/06/search/',
      date: new Date('2026-09-06T00:00:00+08:00'),
      categories: { toArray: () => [{ name: '技术' }] },
      tags: { toArray: () => [{ name: 'Hexo' }] },
      excerpt: '<p>摘要</p>'
    }] },
    util: { stripHTML: value => value.replace(/<[^>]+>/g, '') }
  });
  assert.equal(index[0].url, '/2026/09/06/search/');
  assert.equal(index[0].category, '技术');
});
