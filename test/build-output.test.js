const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');

test('构建产物包含主题 CSS，而不是空文件', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules', 'hexo', 'bin', 'hexo'), 'generate'], {
    cwd: root,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const cssPath = path.join(root, 'public', 'css', 'style.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.ok(css.length > 1000, '主题 CSS 构建产物不应为空或过短');
  assert.match(css, /\.nature-hero\s*\{/);
  assert.match(css, /--background/);
});
