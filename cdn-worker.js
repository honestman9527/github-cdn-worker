/**
 * @file Cloudflare Worker for a Universal, Secure, and High-Performance GitHub CDN.
 *
 * This script acts as a proxy to fetch and cache files from any accessible GitHub repository,
 * prioritizing security and maintainability.
 *
 * @version 2.0.0
 * @author (Your Name)
 */

// #region --- Configuration ---

const config = {
  // Allows cross-origin requests. Set to your website's domain for better security, or '*' to allow any.
  corsOrigin: '*',

  // GitHub's raw content domain.
  githubDomain: 'raw.githubusercontent.com',

  // Default cache time in seconds (1 day). Can be overridden by the CACHE_TIME env variable.
  defaultCacheTime: 86400,
};

// #endregion

// #region --- ES Modules Entry Point ---

export default {
  /**
   * Main fetch handler for the Worker.
   * @param {Request} request The incoming request.
   * @param {import("@cloudflare/workers-types").Bindings} env The environment variables and bindings.
   * @param {ExecutionContext} ctx The execution context.
   * @returns {Promise<Response>}
   */
  async fetch(request, env, ctx) {
    const { pathname, origin } = new URL(request.url);

    if (request.method === 'OPTIONS') return handleOptions(request);
    if (pathname === '/' || pathname === '') return generateLandingPage({ origin });

    try {
      const token = await getToken(request, env);
      const owner = env.GITHUB_OWNER;
      if (!owner) return new Response('GITHUB_OWNER environment variable not set.', { status: 500 });

      const parts = pathname.replace(/^\/+/, '').split('/');
      if (parts.length < 3) return new Response('Invalid path. Format: /repo/branch/path-to-file', { status: 400 });

      const [repo, branch, ...fileParts] = parts;
      const githubUrl = `https://${config.githubDomain}/${owner}/${repo}/${branch}/${fileParts.join('/')}`;

      const headers = token ? { 'Authorization': `token ${token}` } : {};
      const githubResponse = await fetch(githubUrl, { headers });
      if (!githubResponse.ok) return handleGitHubError(githubResponse);

      const response = new Response(githubResponse.body, githubResponse);
      applyHeaders(response.headers, env);
      return response;
    } catch (err) {
      console.error('Proxy request error:', err);
      return new Response(`Proxy request failed: ${err.message}`, { status: 500 });
    }
  },
};

// #endregion

// #region --- Helper Functions ---

/**
 * Retrieves the GitHub token based on a defined priority.
 * 1. 'X-GitHub-Token' header (most secure for client-side requests).
 * 2. URL query parameter `?token=` (convenient but less secure, requires explicit opt-in).
 * 3. Worker environment variable `GITHUB_TOKEN`.
 * @param {Request} request The incoming request.
 * @param {import("@cloudflare/workers-types").Bindings} env
 * @returns {Promise<string|null>} The GitHub token or null if not found.
 */
async function getToken(request, env) {
  // Priority 1: From 'X-GitHub-Token' header.
  const headerToken = request.headers.get('X-GitHub-Token');
  if (headerToken) {
    return headerToken;
  }

  // Priority 2: From URL query parameter (less secure, requires opt-in).
  // This is a potential security risk as tokens can be logged.
  if (env.ALLOW_QUERY_PARAM_TOKEN === 'true') {
    const url = new URL(request.url);
    if (url.searchParams.has('token')) {
      return url.searchParams.get('token');
    }
  }

  // Priority 3: From Worker's environment variable.
  if (env.GITHUB_TOKEN) {
    return env.GITHUB_TOKEN;
  }
  
  // Note: KV logic was removed for simplification, as env vars are the primary method.
  // It can be re-added here if needed.

  return null;
}

/**
 * Handles errors returned from the GitHub API with user-friendly responses.
 * @param {Response} response The error response from GitHub.
 * @returns {Response} A new, user-friendly error Response.
 */
function handleGitHubError(response) {
  if (response.status === 404) {
    return new Response('File not found. Check repository, branch, and file path.', { status: 404 });
  }
  if (response.status === 401 || response.status === 403) {
    return new Response('Access denied. Your token may be invalid or lack permissions.', { status: 403 });
  }
  return new Response(`GitHub API error: ${response.status} ${response.statusText}`, { status: response.status });
}

/**
 * Applies necessary CORS, caching, and security headers to the final response.
 * @param {Headers} headers The response headers object.
 * @param {import("@cloudflare/workers-types").Bindings} env
 */
function applyHeaders(headers, env) {
  const cacheTime = env.CACHE_TIME || config.defaultCacheTime;
  
  headers.set('Cache-Control', `public, max-age=${cacheTime}`);
  headers.set('Access-Control-Allow-Origin', config.corsOrigin);
  headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  headers.set('Access-Control-Max-Age', '86400');
  
  // Security Headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
}

/**
 * Handles preflight (OPTIONS) requests.
 * @param {Request} request The incoming request.
 * @returns {Response} A response with CORS headers.
 */
function handleOptions(request) {
  const headers = new Headers();
  applyHeaders(headers, {});
  // Allow the custom token header for CORS.
  headers.set('Access-Control-Allow-Headers', request.headers.get('Access-Control-Request-Headers') || 'X-GitHub-Token, Content-Type');
  return new Response(null, { headers });
}

/**
 * Generates a user-friendly HTML landing page.
 * @param {URL} url The request URL.
 * @returns {Response} An HTML response.
 */
function generateLandingPage(url) {
  return new Response(
    `<!DOCTYPE html>
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Universal GitHub CDN</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 800px; margin: 2rem auto; padding: 0 1rem; line-height: 1.6; color: #333; }
          h1 { color: #0070f3; border-bottom: 2px solid #f0f0f0; padding-bottom: 0.5rem; }
          code { background: #f1f1f1; padding: 0.2em 0.4em; border-radius: 4px; font-size: 0.9em; }
          .note { background: #fffbe6; padding: 1em; border-left: 4px solid #ffd600; margin: 2rem 0; border-radius: 4px; }
          .note p { margin: 0; }
          li { margin-bottom: 0.5rem; }
        </style>
      </head>
      <body>
        <h1>🚀 Universal GitHub CDN</h1>
        <p>This is a high-performance CDN proxy for GitHub raw content, supporting both public and private repositories.</p>
        <p><strong>使用格式：</strong></p>
        <code>${url.origin}/&lt;repo&gt;/&lt;branch&gt;/&lt;path-to-file&gt;</code>
        <div class="note">
          <h3>仓库 owner 已隐藏</h3>
          <p>owner（仓库拥有者）由 Worker 环境变量 <code>GITHUB_OWNER</code> 决定，用户无需在链接中填写 owner。</p>
        </div>
        <div class="note">
          <h3>访问私有仓库</h3>
          <p>如需访问私有仓库，必须通过以下方式之一提供 GitHub Token（推荐顺序）：</p>
          <ol>
            <li><strong>HTTP Header（推荐）:</strong> 在请求中添加 <code>X-GitHub-Token</code> 头。</li>
            <li><strong>Worker 环境变量:</strong> 在 Worker 设置中配置 <code>GITHUB_TOKEN</code>。</li>
            <li><strong>URL 参数（谨慎使用）:</strong> 在链接后添加 <code>?token=YOUR_TOKEN</code>，需在 Worker 设置中将 <code>ALLOW_QUERY_PARAM_TOKEN</code> 设为 <code>"true"</code>。</li>
          </ol>
        </div>
      </body>
    </html>`,
    {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Cache-Control': `public, max-age=${config.defaultCacheTime}`,
      },
    }
  );
}

// #endregion
