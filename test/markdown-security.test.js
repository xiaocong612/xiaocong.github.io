const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');
const renderMarkdown = require('hexo-renderer-marked/lib/renderer');

const rootDir = path.join(__dirname, '..');
const siteConfig = yaml.load(fs.readFileSync(path.join(rootDir, '_config.yml'), 'utf8'));

function renderUntrustedMarkdown(text) {
  return renderMarkdown.call({
    config: {
      source_dir: path.join(rootDir, 'source'),
      post_asset_folder: false,
      marked: siteConfig.marked,
      url: siteConfig.url,
      root: siteConfig.root
    },
    execFilterSync() {},
    model() { return { findOne() { return null; } }; }
  }, { path: '', text });
}

test('Markdown 渲染会移除不安全的 HTML 与链接', () => {
  const html = renderUntrustedMarkdown('<script>alert(1)</script><img src=x onerror="alert(1)"><a href="javascript:alert(1)">危险链接</a>');

  assert.doesNotMatch(html, /<script|onerror|javascript:/i);
  assert.match(html, /危险链接/);
});
