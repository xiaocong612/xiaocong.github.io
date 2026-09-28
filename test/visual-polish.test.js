const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const script = fs.readFileSync(path.join(root, 'themes/apple-journal/source/js/site-ui.js'), 'utf8');
const style = fs.readFileSync(path.join(root, 'themes/apple-journal/source/css/style.styl'), 'utf8');

function drawNetwork(width) {
  let dots = 0;
  let lines = 0;
  const context = {
    setTransform() {}, clearRect() {}, beginPath() {}, arc() { dots += 1; }, fill() {},
    moveTo() {}, lineTo() { lines += 1; }, stroke() {}
  };
  const dom = new JSDOM('<canvas data-network-background></canvas>', { runScripts: 'outside-only' });
  Object.defineProperty(dom.window.document.documentElement, 'clientWidth', { value: width });
  Object.defineProperty(dom.window.document.documentElement, 'clientHeight', { value: 800 });
  dom.window.HTMLCanvasElement.prototype.getContext = () => context;
  dom.window.matchMedia = () => ({ matches: true });
  dom.window.eval(script);
  return { dots, lines };
}

test('网点在桌面和手机上都有指定密度和可见连线', () => {
  const desktop = drawNetwork(1440);
  const mobile = drawNetwork(390);
  assert.equal(desktop.dots, 150);
  assert.equal(mobile.dots, 72);
  assert.ok(desktop.lines >= 100, `桌面连线过少：${desktop.lines}`);
  assert.ok(mobile.lines >= 35, `手机连线过少：${mobile.lines}`);
});

test('新点逐渐显现，寿命末段逐渐淡出', () => {
  const alphas = [];
  const lineAlphas = [];
  let frameDots = 0;
  let frameLines = 0;
  let nextFrame;
  const context = {
    setTransform() {}, clearRect() { frameDots = 0; frameLines = 0; }, beginPath() {}, arc() {},
    fill() {
      if (frameDots++ === 0) alphas.push(Number(this.fillStyle.match(/, ([\d.]+)\)$/)?.[1]));
    },
    moveTo() {}, lineTo() {}, stroke() {
      if (frameLines++ === 0) lineAlphas.push(Number(this.strokeStyle.match(/, ([\d.]+)\)$/)?.[1]));
    }
  };
  const dom = new JSDOM('<canvas data-network-background></canvas>', { runScripts: 'outside-only' });
  const { window } = dom;
  Object.defineProperty(window.document.documentElement, 'clientWidth', { value: 390 });
  Object.defineProperty(window.document.documentElement, 'clientHeight', { value: 800 });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  window.matchMedia = () => ({ matches: false });
  window.requestAnimationFrame = callback => { nextFrame = callback; return 1; };
  window.cancelAnimationFrame = () => {};
  window.Math.random = () => 0;
  window.eval(script);
  for (let i = 0; i < 530; i += 1) nextFrame();
  assert.ok(alphas[0] < alphas[70], '新点需要缓显');
  assert.ok(alphas[10] < alphas[35] * .2, '缓显的开头需要柔和加速');
  assert.ok(alphas[450] > alphas[490], '旧点需要缓消');
  assert.ok(alphas[490] < alphas[465] * .2, '缓消的结尾需要柔和减速');
  assert.ok(alphas[490] > alphas[500], '点消失前不能突然归零');
  assert.ok(lineAlphas[0] < lineAlphas[70], '连线需要跟随端点缓显');
  assert.ok(lineAlphas[450] > lineAlphas[490], '连线需要跟随端点缓消');
});

test('最近更新和主要面板有圆角、黑色透明底色及蓝色聚焦高亮', () => {
  assert.match(style, /\.stream-band\s*\{[^}]*border-radius:\s*24px/s);
  assert.match(style, /\.stream-band\s*\{[^}]*background:\s*rgba\(0,\s*0,\s*0,\s*\.(?:4|5)/s);
  assert.match(style, /\.featured-story[^}]*background:\s*rgba\(0,\s*0,\s*0,\s*\.(?:4|5)/s);
  assert.match(style, /:focus-within[^}]*border-color:\s*#(?:2997ff|4c9dff)/s);
  assert.match(style, /\.back-to-top\s*\{[^}]*border-radius:\s*50%/s);
  assert.match(style, /@media \(max-width: 760px\)[\s\S]*\.stream-band\s*\{\s*padding:\s*51px\s+\d+px\s+72px;/);
});
