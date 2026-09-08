const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class MockElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.listeners = new Map();
    this.dataset = {};
    this.value = '';
    this.className = '';
    this.href = '';
    this.textContent = '';
  }

  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }
}

async function loadSearchClient(index, baseUrl = '/') {
  const form = new MockElement('form');
  const input = new MockElement('input');
  const results = new MockElement('div');
  const body = new MockElement('body');
  body.dataset.baseUrl = baseUrl;
  let requestedUrl;
  const elements = {
    '[data-search-form]': form,
    '[data-search-input]': input,
    '[data-search-results]': results
  };
  const source = fs.readFileSync(path.join(__dirname, '..', 'themes', 'apple-journal', 'source', 'js', 'search.js'), 'utf8');
  vm.runInNewContext(source, {
    document: {
      body,
      createElement: tagName => new MockElement(tagName),
      querySelector: selector => elements[selector] || null,
      querySelectorAll: () => []
    },
    fetch: async url => {
      requestedUrl = url;
      return { ok: true, json: async () => index };
    },
    setTimeout() {}
  });
  await new Promise(resolve => setImmediate(resolve));
  return { form, input, results, requestedUrl };
}

test('搜索索引地址适配根路径和子路径部署', async () => {
  const root = await loadSearchClient([]);
  const subPath = await loadSearchClient([], '/xiaocong.github.io/');

  assert.equal(root.requestedUrl, '/search.json');
  assert.equal(subPath.requestedUrl, '/xiaocong.github.io/search.json');
});

test('搜索输入会显示匹配文章，并用安全的 DOM 节点渲染内容', async () => {
  const { input, results } = await loadSearchClient([{
    title: '<img src=x onerror=alert(1)>欢迎文章',
    description: '<script>alert(1)</script>摘要',
    category: '<strong>技术</strong>',
    tags: ['测试'],
    date: '2026-09-08',
    url: '/2026/09/08/welcome/'
  }]);

  input.value = '欢迎';
  input.listeners.get('input')();

  const link = results.children[0];
  assert.equal(link.tagName, 'a');
  assert.equal(link.href, '/2026/09/08/welcome/');
  assert.equal(link.children[0].children[0].textContent, '<strong>技术</strong>');
  assert.equal(link.children[1].textContent, '<img src=x onerror=alert(1)>欢迎文章');
  assert.equal(link.children[2].textContent, '<script>alert(1)</script>摘要');
});

test('搜索结果链接会保留项目站点的部署路径', async () => {
  const { input, results } = await loadSearchClient([{
    title: '项目路径文章',
    description: '',
    category: '技术',
    tags: [],
    date: '2026-09-08',
    url: '/2026/09/08/project-path/'
  }], '/xiaocong.github.io/');

  input.value = '项目路径';
  input.listeners.get('input')();

  assert.equal(results.children[0].href, '/xiaocong.github.io/2026/09/08/project-path/');
});

test('搜索结果拒绝非站内链接', async () => {
  const { input, results } = await loadSearchClient([{
    title: '危险地址',
    description: '',
    category: '技术',
    tags: [],
    date: '2026-09-08',
    url: 'javascript:alert(1)'
  }]);

  input.value = '危险';
  input.listeners.get('input')();

  assert.equal(results.children[0].href, '/');
});
