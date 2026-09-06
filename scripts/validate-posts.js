const fs = require('node:fs');
const path = require('node:path');
const frontMatter = require('hexo-front-matter');

const CATEGORIES = ['技术', '学习', '随笔'];

function listMarkdownFiles(sourceDir) {
  if (!fs.existsSync(sourceDir)) return [];
  return fs.readdirSync(sourceDir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(sourceDir, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(entryPath);
    return entry.name.toLowerCase().endsWith('.md') ? [entryPath] : [];
  });
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function validatePostFile(filePath) {
  const errors = [];
  let data;
  try {
    data = frontMatter.parse(fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n'));
  } catch (error) {
    return [`无法解析 Markdown 元数据：${error.message}`];
  }

  if (!String(data.title || '').trim()) errors.push('缺少 title 标题');
  if (!data.date || Number.isNaN(new Date(data.date).getTime())) errors.push('缺少有效的 date 日期');

  const categories = asArray(data.categories);
  if (!categories.length) {
    errors.push('至少填写一个 categories 分类');
  } else {
    const invalid = categories.filter((category) => !CATEGORIES.includes(category));
    if (invalid.length) errors.push(`分类只能是：${CATEGORIES.join('、')}（发现：${invalid.join('、')}）`);
  }

  if (!String(data._content || '').trim()) errors.push('正文不能为空');
  return errors;
}

function validatePosts({ sourceDir }) {
  const errors = [];
  for (const filePath of listMarkdownFiles(sourceDir)) {
    const fileErrors = validatePostFile(filePath);
    for (const error of fileErrors) errors.push({ file: filePath, message: error });
  }
  return { valid: errors.length === 0, errors };
}

module.exports = { CATEGORIES, validatePosts, validatePostFile, listMarkdownFiles };
