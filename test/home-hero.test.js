const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const templatePath = path.join(root, 'themes/apple-journal/layout/_partial/home-hero.ejs');
const fixture = {
  subtitle: '记录日常',
  phrases: [{ text: '你好世界' }, { text: '保持好奇' }],
  quotes: [{ text: '慢慢来，比较快。', author: '小聪' }, { text: '今天也值得记录。' }]
};

function render(home = fixture) {
  assert.ok(fs.existsSync(templatePath), '需要首页独立组件以渲染后台句库');
  return ejs.render(fs.readFileSync(templatePath, 'utf8'), {
    home, settings: { site_name: '小聪的记录', tagline: '技术与生活' },
    config: { title: '博客' }, url_for: value => `/xiaocong.github.io${value}`
  });
}

test('无脚本时首屏按顺序展示站名、小标题、完整文案和名句', () => {
  const document = new JSDOM(render()).window.document;
  assert.equal(document.querySelector('#intro-title').textContent, '小聪的记录');
  assert.equal(document.querySelector('.hero-subtitle').textContent, '记录日常');
  assert.equal(document.querySelector('[data-typed-text]').textContent, '你好世界');
  assert.equal(document.querySelector('[data-quote-text]').textContent, '慢慢来，比较快。');
  assert.equal(document.querySelector('[data-quote-author]').textContent, '小聪');
  assert.equal(document.querySelector('[data-quote-next]').hidden, true);
  const blocks = ['#intro-title', '.hero-subtitle', '.hero-typing', '.hero-quote'];
  blocks.slice(1).forEach((selector, index) => {
    assert.ok(document.querySelector(blocks[index]).compareDocumentPosition(document.querySelector(selector)) & 4);
  });
  assert.equal(document.querySelectorAll('[data-phrase]').length, 2);
  assert.equal(document.querySelectorAll('[data-quote-entry]').length, 2);
});

test('空库、空白条目与缺失库都有可阅读的中文回退', () => {
  for (const home of [{}, { phrases: [], quotes: [] }, { phrases: [{ text: ' ' }], quotes: [null, {}] }]) {
    const document = new JSDOM(render(home)).window.document;
    assert.equal(document.querySelector('[data-typed-text]').textContent, '欢迎来到我的小窝');
    assert.equal(document.querySelector('[data-quote-text]').textContent, '保持好奇，持续记录。');
    assert.equal(document.querySelectorAll('[data-phrase]').length, 1);
    assert.equal(document.querySelector('[data-quote-author]').hidden, true);
  }
});

test('句库内容只能作为文本渲染，不能注入标签或事件', () => {
  const payload = '<img src=x onerror="alert(1)"><script>alert(2)</script>';
  const document = new JSDOM(render({ subtitle: payload, phrases: [{ text: payload }], quotes: [{ text: payload, author: payload }] })).window.document;
  assert.equal(document.querySelectorAll('script, [onerror]').length, 0);
  assert.equal(document.querySelector('[data-typed-text]').textContent, payload);
  assert.equal(document.querySelector('[data-quote-text]').textContent, payload);
  assert.equal(document.querySelector('[data-quote-author]').textContent, payload);
});

function interactive(t, home = fixture, reducedMotion = false) {
  const dom = new JSDOM(render(home), { runScripts: 'outside-only', pretendToBeVisual: true });
  t.after(() => dom.window.close());
  const { window } = dom;
  const media = new window.EventTarget();
  media.matches = reducedMotion;
  window.matchMedia = () => media;
  const timers = new Map();
  let now = 0;
  let serial = 0;
  window.setTimeout = (callback, delay = 0) => {
    timers.set(++serial, { callback, at: now + delay });
    return serial;
  };
  window.clearTimeout = id => timers.delete(id);
  let observerCallback;
  window.IntersectionObserver = class {
    constructor(callback) { observerCallback = callback; }
    observe() {}
  };
  const scriptPath = path.join(root, 'themes/apple-journal/source/js/home-hero.js');
  assert.ok(fs.existsSync(scriptPath), '需要实际首页交互脚本');
  window.eval(fs.readFileSync(scriptPath, 'utf8'));
  return {
    window, document: window.document,
    typed: () => window.document.querySelector('[data-typed-text]').textContent,
    tick(duration) {
      const end = now + duration;
      for (let steps = 0; steps < 10000; steps++) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        now = next[1].at;
        timers.delete(next[0]);
        next[1].callback();
      }
      now = end;
    },
    motion(value) { media.matches = value; media.dispatchEvent(new window.Event('change')); },
    intersect(value) { observerCallback([{ isIntersecting: value }]); }
  };
}

test('文案逐字打出，停留后逐字删除，再进入下一句', t => {
  const app = interactive(t);
  assert.equal(app.typed(), '');
  app.tick(100);
  assert.equal(app.typed(), '你');
  app.tick(300);
  assert.equal(app.typed(), '你好世界');
  app.tick(2199);
  assert.equal(app.typed(), '你好世界');
  app.tick(1);
  assert.equal(app.typed(), '你好世');
  app.tick(150);
  assert.equal(app.typed(), '');
  app.tick(400);
  assert.equal(app.typed(), '保');
  app.tick(300);
  assert.equal(app.typed(), '保持好奇');
});

test('组合字符按完整字素打字和删除', t => {
  const app = interactive(t, { phrases: [{ text: 'A👩‍💻好' }] });
  app.tick(200);
  assert.equal(app.typed(), 'A👩‍💻');
  app.tick(2300);
  assert.equal(app.typed(), 'A👩‍💻');
  app.tick(50);
  assert.equal(app.typed(), 'A');
});

test('减少动效保持完整文案，名句仍可手动切换', t => {
  const app = interactive(t, fixture, true);
  app.tick(10000);
  assert.equal(app.typed(), '你好世界');
  const button = app.document.querySelector('[data-quote-next]');
  assert.equal(button.hidden, false);
  button.click();
  assert.equal(app.document.querySelector('[data-quote-text]').textContent, '今天也值得记录。');
  assert.equal(app.document.querySelector('[data-quote-author]').hidden, true);
  app.motion(false);
  app.tick(100);
  assert.equal(app.typed(), '你');
  app.motion(true);
  assert.equal(app.typed(), '你好世界');
  app.tick(10000);
  assert.equal(app.typed(), '你好世界');
});

test('标签页隐藏和首屏离开视口时暂停，再恢复当前打字进度', t => {
  const app = interactive(t);
  app.tick(100);
  Object.defineProperty(app.document, 'hidden', { configurable: true, value: true });
  app.document.dispatchEvent(new app.window.Event('visibilitychange'));
  app.tick(5000);
  assert.equal(app.typed(), '你');
  Object.defineProperty(app.document, 'hidden', { configurable: true, value: false });
  app.document.dispatchEvent(new app.window.Event('visibilitychange'));
  app.tick(100);
  assert.equal(app.typed(), '你好');
  app.intersect(false);
  app.tick(5000);
  assert.equal(app.typed(), '你好');
  app.intersect(true);
  app.tick(100);
  assert.equal(app.typed(), '你好世');
});

test('换句淡出后更换内容，连续点击不重复当前句子或打乱切换', t => {
  const app = interactive(t);
  const button = app.document.querySelector('[data-quote-next]');
  const content = app.document.querySelector('[data-quote-content]');
  button.click();
  button.click();
  assert.equal(button.disabled, true);
  assert.ok(content.classList.contains('is-changing'));
  assert.equal(app.document.querySelector('[data-quote-text]').textContent, '慢慢来，比较快。');
  app.tick(180);
  assert.equal(app.document.querySelector('[data-quote-text]').textContent, '今天也值得记录。');
  assert.equal(app.document.querySelector('[data-quote-author]').hidden, true);
  app.tick(180);
  assert.equal(button.disabled, false);
  button.click();
  app.tick(360);
  assert.equal(app.document.querySelector('[data-quote-text]').textContent, '慢慢来，比较快。');
  assert.equal(app.document.querySelector('[data-quote-author]').textContent, '小聪');
});

test('单条名句禁用换句，脚本不会把名句里的 HTML 当成元素', t => {
  const text = '<img src=x onerror=alert(1)>';
  const app = interactive(t, { quotes: [{ text }] });
  const button = app.document.querySelector('[data-quote-next]');
  assert.equal(button.disabled, true);
  button.click();
  app.tick(1000);
  assert.equal(app.document.querySelector('[data-quote-text]').textContent, text);
  assert.equal(app.document.querySelectorAll('[onerror]').length, 0);
});
