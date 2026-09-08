const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

const rootDir = path.join(__dirname, '..');
const footerPath = path.join(rootDir, 'themes', 'apple-journal', 'layout', '_partial', 'footer.ejs');
const footerTemplate = fs.readFileSync(footerPath, 'utf8');

function renderFooter(github) {
  return ejs.render(footerTemplate, {
    site: { data: { settings: { social: github === undefined ? undefined : { github }, footer_note: '保持好奇，持续记录。' } } },
    config: { author: '小聪' }
  });
}

test('页脚仅渲染安全的 GitHub HTTPS 链接', () => {
  const html = renderFooter('https://github.com/xiaocong612');

  assert.match(html, /href="https:\/\/github\.com\/xiaocong612"/);
  assert.match(html, /rel="me noopener"/);
});

test('页脚会忽略不安全或仿冒的社交链接', () => {
  const unsafeUrls = [
    'javascript:alert(1)',
    'http://github.com/xiaocong612',
    'https://github.com.evil.example/xiaocong612',
    'https://github.com@evil.example/xiaocong612',
    'https://github.com/'
  ];

  for (const unsafeUrl of unsafeUrls) {
    const html = renderFooter(unsafeUrl);
    assert.doesNotMatch(html, /class="footer-links">[\s\S]*GitHub/,
      `不应渲染链接：${unsafeUrl}`);
  }
});

test('未配置 GitHub 链接时页脚不显示社交链接', () => {
  const html = renderFooter();

  assert.doesNotMatch(html, /class="footer-links">[\s\S]*GitHub/);
});
