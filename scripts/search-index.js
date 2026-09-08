const fs = require('node:fs');
const path = require('node:path');

function values(collection) {
  if (!collection) return [];
  if (typeof collection.toArray === 'function') return collection.toArray();
  return Array.isArray(collection) ? collection : [];
}

function formatSearchDate(date) {
  if (date && typeof date.format === 'function') return date.format('YYYY-MM-DD');

  const parsed = new Date(date);
  const pad = value => String(value).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

function buildSearchIndex(hexo) {
  const posts = values(hexo.locals.get('posts')).filter(post => !post.draft);
  return posts.map(post => {
    const categories = values(post.categories);
    const tags = values(post.tags);
    const description = post.description || hexo.util.stripHTML(post.excerpt || post.content || '').replace(/\s+/g, ' ').slice(0, 180);
    return {
      title: post.title,
      description,
      category: categories[0] ? categories[0].name : '随笔',
      tags: tags.map(tag => tag.name),
      date: formatSearchDate(post.date),
      url: `/${String(post.path || '').replace(/^\/+/, '')}`
    };
  });
}

function registerSearchIndex(hexo) {
  hexo.extend.filter.register('after_generate', function generateSearchIndex() {
    fs.mkdirSync(hexo.public_dir, { recursive: true });
    const outputPath = path.join(hexo.public_dir, 'search.json');
    fs.writeFileSync(outputPath, JSON.stringify(buildSearchIndex(hexo), null, 2), 'utf8');
  });
}

if (typeof hexo !== 'undefined') registerSearchIndex(hexo);

module.exports = { buildSearchIndex, formatSearchDate, registerSearchIndex };
