const { spawnSync } = require('node:child_process');
const { checkSite, printResult } = require('./check-site');

const PUBLISH_BRANCH = 'main';
const PUBLISH_REMOTE = 'origin';

function defaultRunGit(args, rootDir) {
  const result = spawnSync('git', args, { cwd: rootDir, encoding: 'utf8', stdio: 'pipe' });
  return { ...result, output: `${result.stdout || ''}${result.stderr || ''}${result.error ? result.error.message : ''}` };
}

function ensurePublishTarget(runGit, rootDir) {
  const branchResult = runGit(['branch', '--show-current'], rootDir);
  if (branchResult.status !== 0) throw new Error(`无法读取当前 Git 分支：${branchResult.output || '未知错误'}`);
  const branch = branchResult.output.trim();
  if (!branch) throw new Error('当前不在任何 Git 分支上，请切换到 main 分支后再发布。');
  if (branch !== PUBLISH_BRANCH) {
    throw new Error(`当前分支为 ${branch}，发布只能从 ${PUBLISH_BRANCH} 分支进行。请先切换到 ${PUBLISH_BRANCH}。`);
  }

  const originResult = runGit(['remote', 'get-url', PUBLISH_REMOTE], rootDir);
  if (originResult.status !== 0 || !originResult.output.trim()) {
    throw new Error(`未配置 ${PUBLISH_REMOTE} 远程仓库。请先添加 GitHub 仓库地址，再运行发布。`);
  }

  const upstreamResult = runGit(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'], rootDir);
  if (upstreamResult.status !== 0 || !upstreamResult.output.trim()) return false;

  const upstream = upstreamResult.output.trim();
  const expectedUpstream = `${PUBLISH_REMOTE}/${PUBLISH_BRANCH}`;
  if (upstream !== expectedUpstream) {
    throw new Error(`${PUBLISH_BRANCH} 分支的上游分支必须是 ${expectedUpstream}，当前为 ${upstream}。请先修正上游分支后再发布。`);
  }
  return true;
}

function publish({ rootDir = process.cwd(), message = '', check = checkSite, runGit = defaultRunGit } = {}) {
  const checkResult = check({ rootDir });
  if (!checkResult.valid) {
    printResult(checkResult);
    return { published: false, reason: 'check-failed', checkResult };
  }

  const hasUpstream = ensurePublishTarget(runGit, rootDir);

  const status = runGit(['status', '--short'], rootDir);
  if (status.status !== 0) throw new Error(`无法读取 Git 状态：${status.output || '未知错误'}`);
  const hasChanges = Boolean(status.output.trim());
  const commitMessage = message.trim() || '更新中文博客内容';

  if (hasChanges) {
    const add = runGit(['add', '-A'], rootDir);
    if (add.status !== 0) throw new Error(`暂存变更失败：${add.output}`);
    const commit = runGit(['commit', '-m', commitMessage], rootDir);
    if (commit.status !== 0) throw new Error(`提交失败：${commit.output}`);
  }

  const pushArgs = hasUpstream
    ? ['push', PUBLISH_REMOTE, PUBLISH_BRANCH]
    : ['push', '-u', PUBLISH_REMOTE, PUBLISH_BRANCH];
  const push = runGit(pushArgs, rootDir);
  if (push.status !== 0) {
    console.error('本地提交已保留，但推送失败。请检查远程地址和 Git 登录状态后再次运行 npm run publish。');
    return { published: false, reason: 'push-failed', commitMessage, committed: hasChanges };
  }
  console.log(hasChanges ? '已提交并推送，GitHub Actions 将自动发布网站。' : '没有新的工作区变更，已同步 main 分支的已有提交。');
  return { published: true, commitMessage, committed: hasChanges };
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
