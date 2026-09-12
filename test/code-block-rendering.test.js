const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const rootDir = path.join(__dirname, '..');
const outputPath = path.join(rootDir, 'public', '2026', '09', '06', 'hello-world', 'index.html');

test('文章中的 fenced code block 会生成可见的 pre code HTML', () => {
  const hexoCli = path.join(rootDir, 'node_modules', 'hexo', 'bin', 'hexo');
  const cleanResult = spawnSync(process.execPath, [hexoCli, 'clean'], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: 'pipe'
  });

  assert.equal(cleanResult.status, 0, cleanResult.stderr || cleanResult.stdout);

  const result = spawnSync(process.execPath, [hexoCli, 'generate'], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: 'pipe'
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const html = fs.readFileSync(outputPath, 'utf8');
  assert.match(html, /<pre[\s\S]*<code[\s\S]*npm run post[\s\S]*<\/code>[\s\S]*<\/pre>/);
});
