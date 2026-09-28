const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');

test('构建标签索引页并列出可访问的标签', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules', 'hexo', 'bin', 'hexo'), 'generate'], {
    cwd: root,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const output = path.join(root, 'public', 'tags', 'index.html');
  assert.ok(fs.existsSync(output), '标签索引页应生成到 /tags/');

  const document = new JSDOM(fs.readFileSync(output, 'utf8')).window.document;
  assert.equal(document.querySelector('h1')?.textContent.trim(), '标签');
  const links = [...document.querySelectorAll('a.tag-index-item')];
  assert.ok(links.length >= 1, '标签索引页应至少包含一个标签');
  assert.ok(links.some(link => /\/tags\/Hexo\/$/.test(link.getAttribute('href'))), '应包含 Hexo 标签链接');
});
