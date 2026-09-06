(function () {
  const form = document.querySelector('[data-search-form]');
  const input = document.querySelector('[data-search-input]');
  const results = document.querySelector('[data-search-results]');
  if (!form || !input || !results) return;

  let index = [];
  const render = (items, hasQuery) => {
    if (!hasQuery) {
      results.innerHTML = '<p class="search-empty">输入关键词开始搜索。</p>';
      return;
    }
    if (!items.length) {
      results.innerHTML = '<p class="search-empty">没有找到匹配的文章。</p>';
      return;
    }
    results.innerHTML = items.map(item => `
      <a class="search-result" href="${item.url}">
        <div class="post-labels"><span>${item.category || '随笔'}</span><time>${item.date || ''}</time></div>
        <h2>${item.title}</h2>
        <p>${item.description || ''}</p>
      </a>
    `).join('');
  };
  const search = () => {
    const query = input.value.trim().toLowerCase();
    const items = index.filter(item => [item.title, item.description, item.category, ...(item.tags || [])].join(' ').toLowerCase().includes(query)).slice(0, 20);
    render(items, Boolean(query));
  };
  fetch(`${document.body.dataset.baseUrl || ''}/search.json`)
    .then(response => response.ok ? response.json() : [])
    .then(data => { index = Array.isArray(data) ? data : []; render([], false); })
    .catch(() => { results.innerHTML = '<p class="search-empty">搜索索引暂时不可用，请稍后再试。</p>'; });
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
