const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const hexoCli = path.join(root, 'node_modules', 'hexo', 'bin', 'hexo');

function generate() {
  const result = spawnSync(process.execPath, [hexoCli, 'generate'], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('所有页面输出动态背景和返回顶部按钮，首页额外输出调参面板', () => {
  generate();
  const home = new JSDOM(fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8')).window.document;
  const post = new JSDOM(fs.readFileSync(path.join(root, 'public', '2026', '09', '06', 'hello-world', 'index.html'), 'utf8')).window.document;

  for (const document of [home, post]) {
    assert.ok(document.querySelector('[data-network-background]'));
    assert.ok(document.querySelector('[data-back-to-top]'));
  }
  assert.ok(home.querySelector('[data-liquid-panel]'));
  assert.equal(home.querySelector('[data-liquid-panel]').hidden, true);
  assert.equal(post.querySelector('[data-liquid-panel]'), null);
});

test('返回顶部只在可滚动且离开顶部后显示', () => {
  const script = fs.readFileSync(path.join(root, 'themes', 'apple-journal', 'source', 'js', 'site-ui.js'), 'utf8');
  const dom = new JSDOM('<button data-back-to-top></button>', { runScripts: 'outside-only' });
  const { window } = dom;
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
  Object.defineProperty(window.document.documentElement, 'scrollHeight', { value: 1600, configurable: true });
  window.matchMedia = () => ({ matches: false });
  window.requestAnimationFrame = callback => window.setTimeout(callback, 0);
  window.eval(script);
  const button = window.document.querySelector('[data-back-to-top]');
  assert.equal(button.classList.contains('is-visible'), false);
  Object.defineProperty(window, 'scrollY', { value: 120, configurable: true });
  window.dispatchEvent(new window.Event('scroll'));
  assert.equal(button.classList.contains('is-visible'), true);
  let scrollOptions;
  window.scrollTo = options => { scrollOptions = options; };
  button.click();
  assert.equal(scrollOptions.top, 0);
  assert.equal(scrollOptions.behavior, 'smooth');
});

test('Shift + T 可以切换首页调参面板', () => {
  const script = fs.readFileSync(path.join(root, 'themes', 'apple-journal', 'source', 'js', 'site-ui.js'), 'utf8');
  const dom = new JSDOM('<section data-liquid-panel hidden><button data-liquid-close>关闭</button><input data-liquid-param="blur" type="range" value="12" step="1"><output data-liquid-output="blur"></output></section>', { runScripts: 'outside-only' });
  dom.window.matchMedia = () => ({ matches: false });
  dom.window.eval(script);
  const panel = dom.window.document.querySelector('[data-liquid-panel]');
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'T', shiftKey: true }));
  assert.equal(panel.hidden, false);
  dom.window.document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
  assert.equal(panel.hidden, true);
});

test('首页导航在主视觉滚出视口前保持透明叠加', () => {
  const script = fs.readFileSync(path.join(root, 'themes', 'apple-journal', 'source', 'js', 'site-ui.js'), 'utf8');
  const dom = new JSDOM('<header class="site-header-home"></header><section class="nature-hero"></section>', { runScripts: 'outside-only' });
  const { window } = dom;
  const hero = window.document.querySelector('.nature-hero');
  let heroBottom = 760;
  hero.getBoundingClientRect = () => ({ bottom: heroBottom });
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
  window.matchMedia = () => ({ matches: false });
  window.eval(script);
  const header = window.document.querySelector('.site-header-home');

  Object.defineProperty(window, 'scrollY', { value: 40, configurable: true });
  window.dispatchEvent(new window.Event('scroll'));
  assert.equal(header.classList.contains('is-scrolled'), false);

  heroBottom = -1;
  Object.defineProperty(window, 'scrollY', { value: 761, configurable: true });
  window.dispatchEvent(new window.Event('scroll'));
  assert.equal(header.classList.contains('is-scrolled'), true);
});

test('文章目录位于头像下方的阅读侧栏，链接对应正文标题', () => {
  generate();
  const html = fs.readFileSync(path.join(root, 'public', '2026', '09', '06', 'hello-world', 'index.html'), 'utf8');
  const document = new JSDOM(html).window.document;
  const sidebar = document.querySelector('.post-sidebar');
  assert.ok(sidebar, '文章页需要专用阅读侧栏');
  assert.ok(sidebar.querySelector('.sidebar-avatar'));
  const panel = sidebar.querySelector('.toc-panel');
  assert.ok(panel, '目录应在阅读侧栏中');
  const stack = sidebar.querySelector('.post-sidebar-content');
  assert.ok(stack, '目录和其他 widget 应在同一个滚动容器中');
  assert.ok(stack.contains(panel));
  assert.ok(stack.contains(sidebar.querySelector('.sidebar-stats')));
  assert.ok(stack.contains(sidebar.querySelector('.sidebar-recent-list')));
  assert.ok(sidebar.querySelector('.sidebar-profile').compareDocumentPosition(panel) & document.defaultView.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.equal(document.querySelector('.reading-shell .toc-panel'), null);
  assert.ok(sidebar.querySelector('.sidebar-recent-list'), '文章侧栏保留最近更新');
  assert.ok(sidebar.querySelector('.sidebar-chip-list'), '文章侧栏保留标签');
  assert.ok(sidebar.querySelector('.sidebar-category-list'), '文章侧栏保留分类');
  assert.ok(panel.compareDocumentPosition(sidebar.querySelector('.sidebar-recent-list')) & document.defaultView.Node.DOCUMENT_POSITION_FOLLOWING);
  for (const link of panel.querySelectorAll('a[href^="#"]')) {
    assert.ok(document.getElementById(decodeURIComponent(link.hash.slice(1))), `${link.href} 应对应正文标题`);
  }
});

test('目录卡片按侧栏宽度保持固定的约 1.35 倍高度', () => {
  const style = fs.readFileSync(path.join(root, 'themes', 'apple-journal', 'source', 'css', 'style.styl'), 'utf8');
  const rule = style.match(/\.toc-panel\s*\{([^}]*)\}/);
  assert.ok(rule);
  assert.match(rule[1], /aspect-ratio:\s*20\s*\/\s*27\s*;/);
  assert.doesNotMatch(rule[1], /height:\s*unquote\('min\(/);
});

test('滚动文章时目录高亮当前章节，并只滚动目录列表', () => {
  const script = fs.readFileSync(path.join(root, 'themes', 'apple-journal', 'source', 'js', 'site-ui.js'), 'utf8');
  const dom = new JSDOM('<aside class="post-sidebar"><section class="toc-panel"><nav class="toc-scroll"><a href="#first">第一节</a><a href="#second">第二节</a></nav></section></aside><article class="article-body"><h2 id="first">第一节</h2><h2 id="second">第二节</h2></article>', { runScripts: 'outside-only' });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false });
  const [first, second] = window.document.querySelectorAll('.article-body h2');
  let secondTop = 500;
  first.getBoundingClientRect = () => ({ top: -100 });
  second.getBoundingClientRect = () => ({ top: secondTop });
  const list = window.document.querySelector('.toc-scroll');
  const links = window.document.querySelectorAll('.toc-panel a');
  list.getBoundingClientRect = () => ({ top: 100, bottom: 200 });
  list.scrollTop = 80;
  links[0].getBoundingClientRect = () => ({ top: 110, bottom: 140 });
  links[1].getBoundingClientRect = () => ({ top: 250, bottom: 280 });
  Object.defineProperty(window, 'scrollY', { value: 400, writable: true });
  window.eval(script);
  assert.equal(links[0].getAttribute('aria-current'), 'location');
  secondTop = 70;
  window.dispatchEvent(new window.Event('scroll'));
  assert.equal(links[0].hasAttribute('aria-current'), false);
  assert.equal(links[1].getAttribute('aria-current'), 'location');
  assert.equal(list.scrollTop, 160);
  assert.equal(window.scrollY, 400, '目录跟随高亮不能滚动整页');
});
