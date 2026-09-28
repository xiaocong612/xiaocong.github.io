const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');

test('首页提供自然主视觉和真实文章入口', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'node_modules', 'hexo', 'bin', 'hexo'), 'generate'], {
    cwd: root,
    encoding: 'utf8'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  const document = new JSDOM(html).window.document;
  const hero = document.querySelector('.nature-hero');
  assert.ok(hero, '首页需要自然主题首屏');
  assert.match(hero.querySelector('img').getAttribute('src'), /blog-hero-nature-a\.webp$/);
  assert.ok(document.querySelector('a[href$="/archives/"]'), '保留归档入口');
  assert.ok(document.querySelector('.post-stream a[href*="/2026/"]'), '保留文章入口');
  assert.ok(fs.statSync(path.join(root, 'public', 'images', 'blog-hero-nature-a.webp')).size > 100000);
});

test('首页首屏之后提供工作台侧栏和内容区', () => {
  const html = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  const document = new JSDOM(html).window.document;
  const workbench = document.querySelector('.workbench-shell');
  assert.ok(workbench, '首页需要工作台容器');
  assert.ok(workbench.querySelector('.site-sidebar'), '工作台需要侧栏');
  assert.ok(workbench.querySelector('.sidebar-avatar[src$="/images/profile-cat.jpg"]'), '侧栏需要猫咪头像');
  assert.equal(workbench.querySelectorAll('.sidebar-stats dd').length, 3, '侧栏需要三个统计值');
  assert.ok(workbench.querySelector('.sidebar-recent-list'), '侧栏需要最近更新 widget');
  assert.ok(workbench.querySelector('.sidebar-chip-list'), '侧栏需要标签 widget');
  assert.ok(workbench.querySelector('.sidebar-category-list'), '侧栏需要分类 widget');
  assert.ok(workbench.querySelector('.workbench-welcome'), '内容区需要欢迎栏');
  assert.ok(workbench.querySelector('.featured-story'), '内容区需要精选文章');
  assert.ok(document.querySelector('.nature-hero').compareDocumentPosition(workbench) & document.defaultView.Node.DOCUMENT_POSITION_FOLLOWING);
});

test('首页主视觉覆盖完整首屏并把工作台推到首屏之后', () => {
  const style = fs.readFileSync(path.join(root, 'themes', 'apple-journal', 'source', 'css', 'style.styl'), 'utf8');
  const desktopHeroRule = style.match(/\.nature-hero\s*\{([\s\S]*?)\n\}/);
  const mobileHeroRule = style.match(/@media\s*\(max-width:\s*760px\)\s*\{([\s\S]*?)\n\}/);
  assert.ok(desktopHeroRule, '需要桌面端主视觉样式');
  assert.ok(mobileHeroRule, '需要移动端主视觉样式');
  assert.match(desktopHeroRule[1], /min-height:\s*100svh\s*;/, '桌面端主视觉需要覆盖完整视口');
  assert.match(mobileHeroRule[1], /\.nature-hero\s*\{\s*min-height:\s*100svh\s*;/, '移动端主视觉需要覆盖完整视口');
  assert.doesNotMatch(style, /nature-hero[^\n]*min\(720px/, '主视觉不应再被 720px 上限截断');
});

test('首页导航叠加在主视觉上方而不是占用主视觉空间', () => {
  const style = fs.readFileSync(path.join(root, 'themes', 'apple-journal', 'source', 'css', 'style.styl'), 'utf8');
  const headerRule = style.match(/\.site-header-home\s*\{([\s\S]*?)\n\}/);
  assert.ok(headerRule, '需要首页导航样式');
  assert.match(headerRule[1], /position:\s*fixed\s*;/, '首页导航需要始终叠在首屏图片上');
  assert.match(headerRule[1], /z-index:\s*\d+\s*;/, '首页导航需要明确叠放层级');
  assert.match(style, /\.site-header-home[\s\S]*?\.nature-hero\s*\{[\s\S]*?z-index:\s*\d+\s*;/, '主视觉需要建立高于页面背景的叠放层级');
});
