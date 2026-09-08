const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const yaml = require('js-yaml');
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

test('带冒号的标题会写入有效的 YAML front matter', () => {
  const root = tempRoot();
  const filePath = createPost({ rootDir: root, title: 'C++: 中文笔记', date: '2026-09-08 10:00:00' });
  const content = fs.readFileSync(filePath, 'utf8');
  const frontMatter = content.slice(4, content.indexOf('\n---', 4));

  assert.equal(yaml.load(frontMatter).title, 'C++: 中文笔记');
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

function createPublishGitStub(responses = {}) {
  const calls = [];
  return {
    calls,
    runGit(args) {
      calls.push(args);
      return responses[args.join(' ')] || { status: 0, output: '' };
    }
  };
}

test('干净工作区仍会推送已提交但未同步的 main 分支', () => {
  const git = createPublishGitStub({
    'branch --show-current': { status: 0, output: 'main\n' },
    'remote get-url origin': { status: 0, output: 'https://github.com/xiaocong612/xiaocong.github.io.git\n' },
    'rev-parse --abbrev-ref --symbolic-full-name @{upstream}': { status: 0, output: 'origin/main\n' },
    'status --short': { status: 0, output: '' },
    'push origin main': { status: 0, output: 'Everything up-to-date\n' }
  });

  const result = publish({
    rootDir: tempRoot(),
    check: () => ({ valid: true, errors: [] }),
    runGit: git.runGit
  });

  assert.equal(result.published, true);
  assert.equal(result.committed, false);
  assert.deepEqual(git.calls, [
    ['branch', '--show-current'],
    ['remote', 'get-url', 'origin'],
    ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'],
    ['status', '--short'],
    ['push', 'origin', 'main']
  ]);
});

test('发布拒绝非 main 分支', () => {
  const git = createPublishGitStub({
    'branch --show-current': { status: 0, output: 'master\n' }
  });

  assert.throws(
    () => publish({ rootDir: tempRoot(), check: () => ({ valid: true, errors: [] }), runGit: git.runGit }),
    /当前分支为 master，发布只能从 main 分支进行/
  );
  assert.deepEqual(git.calls, [['branch', '--show-current']]);
});

test('发布要求配置 origin 远程仓库', () => {
  const git = createPublishGitStub({
    'branch --show-current': { status: 0, output: 'main\n' },
    'remote get-url origin': { status: 2, output: 'error: No such remote\n' }
  });

  assert.throws(
    () => publish({ rootDir: tempRoot(), check: () => ({ valid: true, errors: [] }), runGit: git.runGit }),
    /未配置 origin 远程仓库/
  );
  assert.deepEqual(git.calls, [
    ['branch', '--show-current'],
    ['remote', 'get-url', 'origin']
  ]);
});

test('未设置上游的 main 首次发布会创建 origin/main 上游', () => {
  const git = createPublishGitStub({
    'branch --show-current': { status: 0, output: 'main\n' },
    'remote get-url origin': { status: 0, output: 'https://github.com/xiaocong612/xiaocong.github.io.git\n' },
    'rev-parse --abbrev-ref --symbolic-full-name @{upstream}': { status: 128, output: 'fatal: no upstream configured\n' },
    'status --short': { status: 0, output: '' },
    'push -u origin main': { status: 0, output: 'branch main set up to track origin/main\n' }
  });

  const result = publish({ rootDir: tempRoot(), check: () => ({ valid: true, errors: [] }), runGit: git.runGit });

  assert.equal(result.published, true);
  assert.equal(result.committed, false);
  assert.deepEqual(git.calls, [
    ['branch', '--show-current'],
    ['remote', 'get-url', 'origin'],
    ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'],
    ['status', '--short'],
    ['push', '-u', 'origin', 'main']
  ]);
});

test('发布要求 main 跟踪 origin/main', () => {
  const git = createPublishGitStub({
    'branch --show-current': { status: 0, output: 'main\n' },
    'remote get-url origin': { status: 0, output: 'https://github.com/xiaocong612/xiaocong.github.io.git\n' },
    'rev-parse --abbrev-ref --symbolic-full-name @{upstream}': { status: 0, output: 'origin/master\n' }
  });

  assert.throws(
    () => publish({ rootDir: tempRoot(), check: () => ({ valid: true, errors: [] }), runGit: git.runGit }),
    /上游分支必须是 origin\/main/
  );
  assert.deepEqual(git.calls, [
    ['branch', '--show-current'],
    ['remote', 'get-url', 'origin'],
    ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']
  ]);
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

test('搜索索引优先使用 Hexo 日期对象的本地日期', () => {
  const index = buildSearchIndex({
    locals: { get: () => [{
      title: '零点文章',
      path: '2026/09/08/midnight/',
      date: { format: pattern => pattern === 'YYYY-MM-DD' ? '2026-09-08' : '' },
      categories: { toArray: () => [] },
      tags: { toArray: () => [] },
      content: '正文'
    }] },
    util: { stripHTML: value => value.replace(/<[^>]+>/g, '') }
  });

  assert.equal(index[0].date, '2026-09-08');
});
