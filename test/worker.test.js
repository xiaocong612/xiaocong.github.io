const test = require('node:test');
const assert = require('node:assert/strict');

const workerModule = import('../worker/src/index.js');

const env = {
  CMS_ORIGIN: 'https://xiaocong612.github.io',
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
  REPO_OWNER: 'xiaocong612',
  REPO_NAME: 'xiaocong.github.io'
};

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
