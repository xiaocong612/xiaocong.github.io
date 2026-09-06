const { spawnSync } = require('node:child_process');
const { checkSite, printResult } = require('./check-site');

function defaultRunGit(args, rootDir) {
  const result = spawnSync('git', args, { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' });
  return { ...result, output: `${result.stdout || ''}${result.stderr || ''}` };
}

function publish({ rootDir = process.cwd(), message = '', check = checkSite, runGit = defaultRunGit } = {}) {
  const checkResult = check({ rootDir });
  if (!checkResult.valid) {
    printResult(checkResult);
    return { published: false, reason: 'check-failed', checkResult };
  }

  const status = runGit(['status', '--short'], rootDir);
  if (status.status !== 0) throw new Error(`无法读取 Git 状态：${status.output || '未知错误'}`);
  if (!status.output.trim()) {
    console.log('没有需要提交的变更。');
    return { published: false, reason: 'clean' };
  }

  const add = runGit(['add', '-A'], rootDir);
  if (add.status !== 0) throw new Error(`暂存变更失败：${add.output}`);
  const commitMessage = message.trim() || '更新中文博客内容';
  const commit = runGit(['commit', '-m', commitMessage], rootDir);
  if (commit.status !== 0) throw new Error(`提交失败：${commit.output}`);
  const push = runGit(['push'], rootDir);
  if (push.status !== 0) {
    console.error('本地提交已保留，但推送失败。请检查远程地址和 Git 登录状态后再次运行 npm run publish。');
    return { published: false, reason: 'push-failed', commitMessage };
  }
  console.log('已提交并推送，GitHub Actions 将自动发布网站。');
  return { published: true, commitMessage };
}

if (require.main === module) {
  try {
    const result = publish({ message: process.argv.slice(2).join(' ') });
    if (result.reason === 'check-failed' || result.reason === 'push-failed') process.exitCode = 1;
  } catch (error) {
    console.error(`发布失败：${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { publish, defaultRunGit };
