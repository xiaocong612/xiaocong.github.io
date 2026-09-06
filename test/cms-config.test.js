const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const rootDir = path.join(__dirname, '..');
const configPath = path.join(rootDir, 'source', 'admin', 'config.yml');

test('Decap CMS 入口和配置存在', () => {
  assert.equal(fs.existsSync(path.join(rootDir, 'source', 'admin', 'index.html')), true);
  assert.equal(fs.existsSync(configPath), true);
  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  assert.equal(config.backend.name, 'github');
  assert.equal(config.backend.repo, 'xiaocong612/xiaocong.github.io');
  assert.equal(config.backend.branch, 'main');
  assert.match(config.backend.auth_endpoint, /\/auth$/);
  assert.equal(config.media_folder, 'source/images/uploads');
  assert.equal(config.public_folder, '/images/uploads');
});

test('文章集合使用统一的中文字段和分类', () => {
  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  const posts = config.collections.find(collection => collection.name === 'posts');
  assert.equal(posts.folder, 'source/_posts');
  const fields = Object.fromEntries(posts.fields.map(field => [field.name, field]));
  assert.deepEqual(fields.categories.options, ['技术', '学习', '随笔']);
  assert.equal(fields.body.widget, 'markdown');
  assert.equal(fields.date.widget, 'datetime');
  assert.equal(fields.pinned.widget, 'boolean');
  assert.equal(fields.draft.widget, 'boolean');
});

test('关于页和站点设置写回预期文件', () => {
  const config = yaml.load(fs.readFileSync(configPath, 'utf8'));
  const about = config.collections.find(collection => collection.name === 'about');
  const settings = config.collections.find(collection => collection.name === 'settings');
  assert.equal(about.files[0].file, 'source/about/index.md');
  assert.equal(settings.files[0].file, 'source/_data/settings.yml');
});
