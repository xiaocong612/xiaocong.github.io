const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workerModule = import('../worker/src/index.js');
const rootDir = path.join(__dirname, '..');

const env = {
  CMS_ORIGIN: 'https://xiaocong612.github.io',
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  REPO_OWNER: 'xiaocong612',
  REPO_NAME: 'xiaocong.github.io'
};

test('Worker 部署脚本显式指定入口和本地配置', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'worker', 'package.json'), 'utf8'));
  assert.match(packageJson.scripts.dev, /wrangler dev src\/index\.js --config wrangler\.toml/);
  assert.match(packageJson.scripts.deploy, /wrangler deploy src\/index\.js --config wrangler\.toml/);
});

test('未配置 CMS 来源时拒绝 OAuth 请求', async () => {
  const { handleRequest } = await workerModule;
  const response = await handleRequest(new Request('https://oauth.example.workers.dev/auth'), { ...env, CMS_ORIGIN: '' });
  assert.equal(response.status, 403);
});

test('未知地址返回 404', async () => {
  const { handleRequest } = await workerModule;
  const response = await handleRequest(new Request('https://oauth.example.workers.dev/unknown'), env);
  assert.equal(response.status, 404);
});

test('缺少 OAuth 回调参数返回 400', async () => {
  const { handleRequest } = await workerModule;
  const response = await handleRequest(new Request('https://oauth.example.workers.dev/callback'), env);
  assert.equal(response.status, 400);
  assert.match(await response.text(), /缺少 OAuth 回调参数/);
});

test('授权范围固定为公开仓库权限，忽略浏览器传入的范围', async () => {
  const { handleRequest } = await workerModule;
  const response = await handleRequest(
    new Request('https://oauth.example.workers.dev/auth?scope=repo%20delete_repo'),
    env
  );
  const githubUrl = new URL(response.headers.get('location'));

  assert.equal(response.status, 302);
  assert.equal(githubUrl.origin, 'https://github.com');
  assert.equal(githubUrl.pathname, '/login/oauth/authorize');
  assert.equal(githubUrl.searchParams.get('scope'), 'public_repo');
});

test('成功回调生成 Decap 登录消息', async () => {
  const { createState, handleRequest } = await workerModule;
  const redirectUri = 'https://oauth.example.workers.dev/callback';
  const state = await createState({ origin: env.CMS_ORIGIN, redirectUri, secret: env.GITHUB_CLIENT_SECRET });
  let exchangeRequest;
  const response = await handleRequest(
    new Request(`https://oauth.example.workers.dev/callback?code=code-123&state=${encodeURIComponent(state)}`),
    env,
    {},
    async (_url, options) => {
      exchangeRequest = options;
      return new Response(JSON.stringify({ access_token: 'access-token' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    }
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /authorization:github:success/);
  assert.match(html, /access-token/);
  assert.equal(JSON.parse(exchangeRequest.body).code, 'code-123');
  assert.equal(JSON.parse(exchangeRequest.body).client_secret, env.GITHUB_CLIENT_SECRET);
  assert.doesNotMatch(html, /client-secret/);
});

test('用户取消 GitHub 授权时生成 Decap 错误消息', async () => {
  const { createState, handleRequest } = await workerModule;
  const redirectUri = 'https://oauth.example.workers.dev/callback';
  const state = await createState({ origin: env.CMS_ORIGIN, redirectUri, secret: env.GITHUB_CLIENT_SECRET });
  const response = await handleRequest(
    new Request(`https://oauth.example.workers.dev/callback?error=access_denied&state=${encodeURIComponent(state)}`),
    env
  );
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /authorization:github:error/);
  assert.match(html, /你已取消 GitHub 授权/);
});

test('GitHub 令牌交换失败时生成 Decap 错误消息', async () => {
  const { createState, handleRequest } = await workerModule;
  const redirectUri = 'https://oauth.example.workers.dev/callback';
  const state = await createState({ origin: env.CMS_ORIGIN, redirectUri, secret: env.GITHUB_CLIENT_SECRET });
  const response = await handleRequest(
    new Request(`https://oauth.example.workers.dev/callback?code=code-123&state=${encodeURIComponent(state)}`),
    env,
    {},
    async () => new Response('上游错误', { status: 502 })
  );
  const html = await response.text();
  assert.equal(response.status, 502);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  assert.match(html, /authorization:github:error/);
  assert.match(html, /GitHub 登录交换失败/);
});

test('GitHub 没有返回令牌时生成 Decap 错误消息', async () => {
  const { createState, handleRequest } = await workerModule;
  const redirectUri = 'https://oauth.example.workers.dev/callback';
  const state = await createState({ origin: env.CMS_ORIGIN, redirectUri, secret: env.GITHUB_CLIENT_SECRET });
  const response = await handleRequest(
    new Request(`https://oauth.example.workers.dev/callback?code=code-123&state=${encodeURIComponent(state)}`),
    env,
    {},
    async () => new Response(JSON.stringify({ error: 'bad_verification_code' }), { status: 200 })
  );
  const html = await response.text();
  assert.equal(response.status, 502);
  assert.match(html, /authorization:github:error/);
  assert.match(html, /GitHub 未返回有效登录令牌/);
});
