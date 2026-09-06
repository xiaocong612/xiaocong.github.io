const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const yaml = require('js-yaml');
const { validatePosts } = require('./validate-posts');

const REQUIRED_SITE_FIELDS = ['title', 'author', 'language', 'url', 'theme', 'permalink', 'index_generator'];

function runHexo(rootDir, command) {
  const hexoCli = path.join(rootDir, 'node_modules', 'hexo', 'bin', 'hexo');
  const result = spawnSync(process.execPath, [hexoCli, command], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: 'pipe'
  });
  if (result.error && !result.stderr) result.stderr = result.error.message;
  return result;
}

function checkSite({ rootDir = process.cwd(), runGenerate = true } = {}) {
  const errors = [];
  const configPath = path.join(rootDir, '_config.yml');
  let config;

  try {
    config = yaml.load(fs.readFileSync(configPath, 'utf8')) || {};
  } catch (error) {
    errors.push({ file: configPath, message: `配置无法解析：${error.message}` });
  }

  if (config) {
    for (const field of REQUIRED_SITE_FIELDS) {
      if (config[field] === undefined || config[field] === null || config[field] === '') {
        errors.push({ file: configPath, message: `缺少必填站点字段：${field}` });
      }
    }
    if (config.title === 'Hexo' || config.author === 'John Doe' || config.language === 'en') {
      errors.push({ file: configPath, message: '仍保留 Hexo 默认英文站点信息，请改成中文内容' });
    }
    if (config.theme !== 'apple-journal') {
      errors.push({ file: configPath, message: 'theme 必须设置为 apple-journal' });
    }
  }

  const postsResult = validatePosts({ sourceDir: path.join(rootDir, 'source', '_posts') });
  errors.push(...postsResult.errors);

  const themeDir = path.join(rootDir, 'themes', 'apple-journal');
  if (!fs.existsSync(themeDir)) errors.push({ file: themeDir, message: '主题目录尚未创建' });

  if (!errors.length && runGenerate) {
    const cleanResult = runHexo(rootDir, 'clean');
    if (cleanResult.status !== 0) {
      errors.push({ file: rootDir, message: `Hexo 清理失败：${(cleanResult.stderr || cleanResult.stdout || '').trim()}` });
    } else {
      const generateResult = runHexo(rootDir, 'generate');
      if (generateResult.status !== 0) {
        errors.push({ file: rootDir, message: `Hexo 生成失败：${(generateResult.stderr || generateResult.stdout || '').trim()}` });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function printResult(result) {
  if (result.valid) {
    console.log('站点检查通过。');
    return;
  }
  console.error('站点检查未通过：');
  for (const error of result.errors) {
    const file = path.relative(process.cwd(), error.file || process.cwd());
    console.error(`- ${file}：${error.message}`);
  }
}

if (require.main === module) {
  const result = checkSite();
  printResult(result);
  process.exitCode = result.valid ? 0 : 1;
}

module.exports = { checkSite, printResult, REQUIRED_SITE_FIELDS };
