const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_OAUTH_SCOPE = 'public_repo';
const encoder = new TextEncoder();

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function normalizeOrigin(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    return url.origin;
  } catch (_) {
    return '';
  }
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function signature(value, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  return crypto.subtle.sign('HMAC', key, encoder.encode(value));
}

async function createState({ origin, redirectUri, secret, now = Date.now(), nonce }) {
  if (!secret) throw new Error('缺少状态签名密钥');
  const payload = base64UrlEncode(encoder.encode(JSON.stringify({
    origin,
    redirectUri,
    issuedAt: now,
    nonce: nonce || crypto.randomUUID()
  })));
  const signed = base64UrlEncode(new Uint8Array(await signature(payload, secret)));
  return `${payload}.${signed}`;
}

async function verifyState(value, secret, maxAgeMs = 10 * 60 * 1000) {
  if (!value || !secret) return null;
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const [payload, suppliedSignature] = parts;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const valid = await crypto.subtle.verify('HMAC', key, base64UrlDecode(suppliedSignature), encoder.encode(payload));
    if (!valid) return null;
    const decoded = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    if (!decoded.issuedAt || Math.abs(Date.now() - decoded.issuedAt) > maxAgeMs) return null;
    return decoded;
  } catch (_) {
    return null;
  }
}

function requiredOrigin(env) {
  return normalizeOrigin(env.CMS_ORIGIN);
}

function expectedRedirect(request) {
  return `${new URL(request.url).origin}/callback`;
}

async function handleAuth(request, env) {
  const cmsOrigin = requiredOrigin(env);
  if (!cmsOrigin) return json({ error: 'OAuth 来源尚未配置。' }, 403);
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return json({ error: 'OAuth 客户端尚未配置。' }, 500);

  const url = new URL(request.url);
  const requestedOrigin = url.searchParams.get('origin') || cmsOrigin;
  if (requestedOrigin !== cmsOrigin) return json({ error: '请求来源不被允许。' }, 403);

  const redirectUri = url.searchParams.get('redirect_uri') || expectedRedirect(request);
  if (redirectUri !== expectedRedirect(request)) return json({ error: '回调地址不被允许。' }, 400);

  const state = await createState({ origin: cmsOrigin, redirectUri, secret: env.GITHUB_CLIENT_SECRET });
  const githubUrl = new URL(GITHUB_AUTHORIZE_URL);
  githubUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  githubUrl.searchParams.set('redirect_uri', redirectUri);
  // Scope must remain server-controlled; query parameters come from the browser.
  githubUrl.searchParams.set('scope', GITHUB_OAUTH_SCOPE);
  githubUrl.searchParams.set('state', state);
  return Response.redirect(githubUrl.toString(), 302);
}

function callbackHtml(token, cmsOrigin) {
  const safeToken = JSON.stringify(token).replace(/</g, '\\u003c');
  const safeOrigin = JSON.stringify(cmsOrigin);
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>登录完成</title></head>
<body><p>登录完成，请返回内容管理页面。</p>
<script>
(() => {
  const targetOrigin = ${safeOrigin};
  const message = 'authorization:github:success:' + JSON.stringify({ token: ${safeToken}, provider: 'github' });
  const receiveMessage = (event) => {
    if (event.origin !== targetOrigin || !window.opener) return;
    window.opener.postMessage(message, targetOrigin);
    window.close();
  };
  window.addEventListener('message', receiveMessage, false);
  if (window.opener) window.opener.postMessage('authorizing:github', targetOrigin);
})();
</script></body></html>`;
}

function callbackErrorHtml(error, cmsOrigin) {
  const safeError = JSON.stringify({ message: error }).replace(/</g, '\\u003c');
  const safeOrigin = JSON.stringify(cmsOrigin);
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>登录未完成</title></head>
<body><p>登录未完成，请返回内容管理页面重试。</p>
<script>
(() => {
  const targetOrigin = ${safeOrigin};
  const message = 'authorization:github:error:' + ${JSON.stringify(safeError)};
  const receiveMessage = (event) => {
    if (event.origin !== targetOrigin || !window.opener) return;
    window.opener.postMessage(message, targetOrigin);
    window.close();
  };
  window.addEventListener('message', receiveMessage, false);
  if (window.opener) window.opener.postMessage('authorizing:github', targetOrigin);
})();
</script></body></html>`;
}

async function handleCallback(request, env, fetchImpl) {
  const cmsOrigin = requiredOrigin(env);
  if (!cmsOrigin) return json({ error: 'OAuth 来源尚未配置。' }, 403);
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) return json({ error: 'OAuth 客户端尚未配置。' }, 500);

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!state) return json({ error: '缺少 OAuth 回调参数。' }, 400);

  const stateData = await verifyState(state, env.GITHUB_CLIENT_SECRET);
  if (!stateData || stateData.origin !== cmsOrigin || stateData.redirectUri !== expectedRedirect(request)) {
    return json({ error: 'OAuth 状态校验失败，请重新登录。' }, 403);
  }

  const providerError = url.searchParams.get('error');
  if (providerError) {
    const description = url.searchParams.get('error_description');
    const message = description || (providerError === 'access_denied' ? '你已取消 GitHub 授权。' : 'GitHub 授权未完成。');
    return new Response(callbackErrorHtml(message, cmsOrigin), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
  if (!code) return json({ error: '缺少 OAuth 回调参数。' }, 400);

  const tokenResponse = await fetchImpl(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: stateData.redirectUri
    })
  });
  if (!tokenResponse.ok) {
    return new Response(callbackErrorHtml('GitHub 登录交换失败，请稍后重试。', cmsOrigin), {
      status: 502,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
    });
  }
  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    return new Response(callbackErrorHtml('GitHub 未返回有效登录令牌。', cmsOrigin), {
      status: 502,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
    });
  }

  return new Response(callbackHtml(tokenData.access_token, cmsOrigin), {
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export async function handleRequest(request, env = {}, _ctx = {}, fetchImpl = fetch) {
  if (request.method !== 'GET') return json({ error: '仅支持 GET 请求。' }, 405);
  const path = new URL(request.url).pathname.replace(/\/$/, '') || '/';
  if (path === '/auth') return handleAuth(request, env);
  if (path === '/callback') return handleCallback(request, env, fetchImpl);
  return json({ error: '找不到请求的地址。' }, 404);
}

export { createState, verifyState, callbackHtml, callbackErrorHtml, normalizeOrigin };

export default { fetch: handleRequest };
