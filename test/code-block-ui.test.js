const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const script = fs.readFileSync(path.join(__dirname, '..', 'themes', 'apple-journal', 'source', 'js', 'code-blocks.js'), 'utf8');

test('代码块增强提供语法颜色、行号、复制和折叠', async () => {
  const dom = new JSDOM('<article class="prose"><pre><code class="language-javascript">const answer = 42;\nconsole.log(answer);</code></pre></article>', {
    runScripts: 'outside-only',
    url: 'https://example.com/'
  });
  dom.window.hljs = require('highlight.js');
  let copied = '';
  Object.defineProperty(dom.window.navigator, 'clipboard', {
    value: { writeText: async value => { copied = value; } }
  });
  dom.window.eval(script);

  const frame = dom.window.document.querySelector('.code-frame');
  assert.ok(frame);
  assert.equal(frame.querySelector('.code-language').textContent, 'JavaScript');
  assert.equal(frame.querySelectorAll('.code-line-number').length, 2);
  assert.ok(frame.querySelector('.hljs-keyword'), '关键字需要彩色 token');
  frame.querySelector('[data-copy-code]').click();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(copied, 'const answer = 42;\nconsole.log(answer);');
  frame.querySelector('[data-toggle-code]').click();
  assert.equal(frame.querySelector('.code-content').hidden, true);
});

test('未知语言保留安全的原始代码', () => {
  const dom = new JSDOM('<article class="prose"><pre><code class="language-unknown">&lt;script&gt;alert(1)&lt;/script&gt;</code></pre></article>', {
    runScripts: 'outside-only'
  });
  dom.window.hljs = require('highlight.js');
  dom.window.eval(script);
  const frame = dom.window.document.querySelector('.code-frame');
  assert.equal(frame.querySelector('code').textContent, '<script>alert(1)</script>');
  assert.equal(frame.querySelector('code script'), null);
});

test('未指定语言时自动识别代码并应用语法颜色', () => {
  const dom = new JSDOM('<article class="prose"><pre><code>#include &lt;stdio.h&gt;\nint main() {\n  printf("hello");\n  return 0;\n}</code></pre></article>', {
    runScripts: 'outside-only'
  });
  dom.window.hljs = require('highlight.js');
  dom.window.eval(script);
  const frame = dom.window.document.querySelector('.code-frame');
  assert.notEqual(frame.querySelector('.code-language').textContent, 'PLAINTEXT');
  assert.ok(frame.querySelector('.hljs-keyword, .hljs-meta, .hljs-type, .hljs-function'), '自动识别的代码需要彩色 token');
});
