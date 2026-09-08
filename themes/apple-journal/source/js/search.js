(function () {
  const form = document.querySelector('[data-search-form]');
  const input = document.querySelector('[data-search-input]');
  const results = document.querySelector('[data-search-results]');
  if (!form || !input || !results) return;

  let index = [];
  const baseUrl = (document.body.dataset.baseUrl || '').replace(/\/$/, '');
  const createEmptyMessage = message => {
    const empty = document.createElement('p');
    empty.className = 'search-empty';
    empty.textContent = message;
    return empty;
  };
  const createSearchResult = item => {
    const link = document.createElement('a');
    link.className = 'search-result';
    link.href = typeof item.url === 'string' && /^\/(?![\\/])/.test(item.url) ? `${baseUrl}${item.url}` || '/' : `${baseUrl}/` || '/';

    const labels = document.createElement('div');
    labels.className = 'post-labels';
    const category = document.createElement('span');
    category.textContent = item.category || '随笔';
    const date = document.createElement('time');
    date.textContent = item.date || '';
    labels.append(category, date);

    const title = document.createElement('h2');
    title.textContent = item.title || '未命名文章';
    const description = document.createElement('p');
    description.textContent = item.description || '';
    link.append(labels, title, description);
    return link;
  };
  const render = (items, hasQuery) => {
    if (!hasQuery) {
      results.replaceChildren(createEmptyMessage('输入关键词开始搜索。'));
      return;
    }
    if (!items.length) {
      results.replaceChildren(createEmptyMessage('没有找到匹配的文章。'));
      return;
    }
    results.replaceChildren(...items.map(createSearchResult));
  };
  const search = () => {
    const query = input.value.trim().toLowerCase();
    const items = index.filter(item => [item.title, item.description, item.category, ...(item.tags || [])].join(' ').toLowerCase().includes(query)).slice(0, 20);
    render(items, Boolean(query));
  };
  fetch(`${baseUrl}/search.json`)
    .then(response => response.ok ? response.json() : [])
    .then(data => { index = Array.isArray(data) ? data : []; render([], false); })
    .catch(() => { results.replaceChildren(createEmptyMessage('搜索索引暂时不可用，请稍后再试。')); });
  form.addEventListener('submit', event => { event.preventDefault(); search(); });
  input.addEventListener('input', search);

  document.querySelectorAll('[data-copy-link]').forEach(button => {
    button.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);
        const original = button.innerHTML;
        button.innerHTML = '<span aria-hidden="true">✓</span> 已复制';
        window.setTimeout(() => { button.innerHTML = original; }, 1800);
      } catch (_) {
        button.textContent = '请手动复制地址';
      }
    });
  });
}());
