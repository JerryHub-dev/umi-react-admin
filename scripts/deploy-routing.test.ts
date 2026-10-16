import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * F6（审查 2026-10）：三条部署产线的 /api 必须"闭合失败"——未配置后端时返回 404/503，
 * 绝不能把 SPA 的 index.html 当成接口响应（原 vercel.json 的 "/(.*)" -> "/index.html"
 * 会把 /api/v1/* 变成 200 HTML，前端会把 HTML 解析成接口数据）。
 *
 * 这里把三个面放在一起比对：
 * - vercel.json 的 rewrites（显式 /api 规则 + 不可能匹配 /api 的 SPA 回退）+ api/ 下的函数
 * - nginx/default.conf 的 `location ^~ /api/`
 * - scripts/serve-dist.mjs（GitHub Pages 等价本地服务器）的实际 HTTP 行为
 *
 * Vercel 的 rewrites 无法表达状态码，所以真正的 404/503 由 api/ 下的函数给出（见 api/[...path].js）。
 * 本测试不联网：代理语义用本机临时后端验证，Vercel 侧为配置级验证 + 函数运行时验证（真机部署 UNVERIFIED）。
 */
const root = new URL('..', import.meta.url);
const read = (file: string) => readFileSync(new URL(file, root), 'utf8');
const require_ = createRequire(import.meta.url);

type ApiHandler = (req: unknown, res: unknown) => Promise<void> | void;
const apiHandler = require_('../api/[...path].js') as ApiHandler;
/** api/index.js 覆盖裸 /api 与 /api/（通配路由不匹配这两个路径），必须与通配入口同一实现 */
const apiIndexHandler = require_('../api/index.js') as ApiHandler;

type Rewrite = { source: string; destination: string };
type Verdict = { status: number; headers: Record<string, string | string[]>; body: string };
type UpstreamRequest = {
  method?: string;
  url?: string;
  body: string;
  headers: Record<string, string | string[] | undefined>;
};

const vercel = JSON.parse(read('vercel.json')) as { rewrites: Rewrite[] };
const apiRuleIndex = vercel.rewrites.findIndex((rule) => rule.source.startsWith('/api/'));
const spaRuleIndex = vercel.rewrites.findIndex((rule) => rule.destination === '/index.html');

/** 与路径到正则的转换保持一致：整条路径（允许一个结尾斜杠）匹配 source */
const matchesSource = (source: string, pathname: string) => new RegExp(`^${source}/?$`).test(pathname);

const invoke = async (
  input: { url: string; method?: string; headers?: Record<string, string>; body?: unknown },
  handler: ApiHandler = apiHandler,
): Promise<Verdict> => {
  const verdict: Verdict = { status: 0, headers: {}, body: '' };
  const res = {
    headersSent: false,
    get statusCode() {
      return verdict.status;
    },
    set statusCode(value: number) {
      verdict.status = value;
    },
    setHeader(name: string, value: string | string[]) {
      verdict.headers[name.toLowerCase()] = value;
    },
    end(chunk?: string | Uint8Array) {
      verdict.body = chunk === undefined ? '' : String(chunk);
    },
    destroy() {},
  };
  await handler({ url: input.url, method: input.method ?? 'GET', headers: input.headers ?? {}, body: input.body }, res);
  return verdict;
};

/** 失败闭合的公共断言：状态码在白名单内、JSON、正文绝不是 SPA HTML */
const expectFailClosed = (verdict: Verdict, statuses: number[]) => {
  expect(statuses).toContain(verdict.status);
  expect(verdict.headers['content-type']).toBe('application/json; charset=utf-8');
  expect(verdict.body).not.toMatch(/<html|<!doctype html|id="root"|SPA-ENTRY-MARKER/i);
  return JSON.parse(verdict.body) as Record<string, unknown>;
};

const withOrigin = async <T>(origin: string | undefined, run: () => Promise<T>): Promise<T> => {
  const previous = process.env.API_ORIGIN;
  if (origin === undefined) delete process.env.API_ORIGIN;
  else process.env.API_ORIGIN = origin;
  try {
    return await run();
  } finally {
    if (previous === undefined) delete process.env.API_ORIGIN;
    else process.env.API_ORIGIN = previous;
  }
};

const children: ReturnType<typeof spawn>[] = [];
const fixtures: string[] = [];

afterEach(async () => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, 'close');
      child.kill();
      await closed;
    }
  }
  for (const fixture of fixtures.splice(0)) await rm(fixture, { recursive: true, force: true });
});

describe('Vercel：/api 先于 SPA 回退且闭合失败（F6）', () => {
  it('显式 /api 规则排在 SPA 回退之前，且不指向 HTML', () => {
    expect(apiRuleIndex).toBeGreaterThanOrEqual(0);
    expect(spaRuleIndex).toBeGreaterThan(apiRuleIndex);
    expect(vercel.rewrites[apiRuleIndex].destination.startsWith('/api/')).toBe(true);
    expect(vercel.rewrites[apiRuleIndex].destination).not.toContain('.html');
    expect(vercel.rewrites[spaRuleIndex].source).not.toContain('/api');
  });

  it('SPA 回退的 source 编译后匹配不到任何 /api* 路径（深链仍然回退）', () => {
    const spa = vercel.rewrites[spaRuleIndex].source;
    for (const pathname of ['/api', '/api/', '/api/v1/users', '/api/not-configured'])
      expect([pathname, matchesSource(spa, pathname)]).toEqual([pathname, false]);
    // 只排除 /api 与 /api/*：形如 /apiary 的普通路径仍然走 SPA 回退
    for (const pathname of ['/', '/dashboard', '/map/amap', '/system/users', '/exception/404', '/apiary'])
      expect([pathname, matchesSource(spa, pathname)]).toEqual([pathname, true]);
  });

  it('函数未命中时 /api 规则的目的地仍然是 JSON 404/503，不回 SPA HTML', async () => {
    await withOrigin(undefined, async () => {
      const verdict = await invoke({ url: vercel.rewrites[apiRuleIndex].destination });
      expectFailClosed(verdict, [404, 503]);
    });
  });

  it('未配置 API_ORIGIN：/api/v1/* 返回 503 JSON（backend_not_configured）', async () => {
    await withOrigin(undefined, async () => {
      for (const url of ['/api/v1/users', '/api/v1/devices/all?page=1', '/api/v1/demo/reset']) {
        const verdict = await invoke({ url, method: url.endsWith('reset') ? 'POST' : 'GET' });
        expect(expectFailClosed(verdict, [503])).toMatchObject({ error: 'backend_not_configured' });
      }
    });
  });

  it('API_ORIGIN 非法（协议/凭据/非 URL）同样 503 JSON，不泄露配置值', async () => {
    for (const origin of ['ftp://backend.example.com', 'https://user:pass@backend.example.com', 'not a url', '//x']) {
      await withOrigin(origin, async () => {
        const verdict = await invoke({ url: '/api/v1/users' });
        const payload = expectFailClosed(verdict, [503]);
        expect(payload).toMatchObject({ error: 'backend_misconfigured' });
        expect(JSON.stringify(payload)).not.toContain(origin);
      });
    }
  });
});

describe('Vercel 函数：/api/v1/* 同源代理语义（F6）', () => {
  const startUpstream = async () => {
    const received: UpstreamRequest[] = [];
    const server = createServer((req, res) => {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => {
        body += chunk;
      });
      req.on('end', () => {
        received.push({ method: req.method, url: req.url, body, headers: req.headers });
        if ((req.url ?? '').startsWith('/api/v1/ping')) {
          res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': ['a=1; Path=/', 'b=2; Path=/'] });
          res.end('{"pong":true}');
          return;
        }
        res.writeHead(418, { 'content-type': 'text/plain' });
        res.end('upstream-teapot');
      });
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const { port } = server.address() as { port: number };
    return {
      origin: `http://127.0.0.1:${port}`,
      received,
      close: () =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        }),
    };
  };

  it('转发方法、查询串、请求体与安全头，并返回上游状态/正文/多值 Set-Cookie', async () => {
    const upstream = await startUpstream();
    try {
      await withOrigin(upstream.origin, async () => {
        const get = await invoke({
          url: '/api/v1/ping?x=1',
          headers: {
            'x-trace': 'yes',
            connection: 'x-attacker-hop-by-hop',
            host: 'evil.example',
            'content-length': '0',
            'proxy-authorization': 'Basic attacker',
          },
        });
        expect(get.status).toBe(200);
        expect(JSON.parse(get.body)).toEqual({ pong: true });
        expect(get.headers['set-cookie']).toEqual(['a=1; Path=/', 'b=2; Path=/']);
        expect(upstream.received[0]).toMatchObject({ method: 'GET', url: '/api/v1/ping?x=1' });
        // hop-by-hop 与 host 不得转发：否则等于把函数变成任意主机代理
        // （connection/host 由 undici 按目标地址重写，攻击者提供的值不能出现在上游）
        expect(upstream.received[0].headers['host']).toBe(`127.0.0.1:${new URL(upstream.origin).port}`);
        expect(upstream.received[0].headers.connection).not.toBe('x-attacker-hop-by-hop');
        expect(upstream.received[0].headers['proxy-authorization']).toBeUndefined();
        expect(upstream.received[0].headers['x-trace']).toBe('yes');

        const post = await invoke({
          url: '/api/v1/tickets/1/rework',
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: { reason: 'x' },
        });
        expect(post.status).toBe(418);
        expect(post.body).toBe('upstream-teapot');
        expect(upstream.received[1]).toMatchObject({
          method: 'POST',
          url: '/api/v1/tickets/1/rework',
          body: '{"reason":"x"}',
        });
      });
    } finally {
      await upstream.close();
    }
  });

  it.each([
    '/api/v1/../../etc/passwd',
    '/api/v1/%2e%2e/secret',
    '/api/v1/%2fetc',
    '/api/v1/%5cwindows',
    '/api/v2/users',
    '/api/health',
    '/apifoo',
    '/dashboard',
  ])('不做任意转发：%s 返回 404 JSON 且后端零访问', async (url) => {
    const upstream = await startUpstream();
    try {
      await withOrigin(upstream.origin, async () => {
        const verdict = await invoke({ url });
        expect(expectFailClosed(verdict, [404])).toMatchObject({ error: 'not_found' });
        expect(upstream.received).toEqual([]);
      });
    } finally {
      await upstream.close();
    }
  });

  it('后端不可达时 502 JSON（不把错误吞成 200/HTML）', async () => {
    await withOrigin('http://127.0.0.1:1', async () => {
      const verdict = await invoke({ url: '/api/v1/users' });
      expect(expectFailClosed(verdict, [502, 503, 504])).toMatchObject({
        error: expect.stringMatching(/unreachable|timeout/),
      });
    });
  });
});

describe('Vercel 函数入口 api/index.js：裸 /api 与 /api/ 也闭合失败（F6）', () => {
  it('与通配入口是同一个处理器（api/index.js 只是转出实现）', () => {
    expect(apiIndexHandler).toBe(apiHandler);
  });

  it('未配置后端时 /api、/api/ 返回 404 JSON，/api/v1/* 返回 503 JSON，都不回 SPA HTML', async () => {
    await withOrigin(undefined, async () => {
      for (const url of ['/api', '/api/']) {
        const verdict = await invoke({ url }, apiIndexHandler);
        expect(expectFailClosed(verdict, [404])).toMatchObject({ error: 'not_found' });
      }
      const v1 = await invoke({ url: '/api/v1/users' }, apiIndexHandler);
      expect(expectFailClosed(v1, [503])).toMatchObject({ error: 'backend_not_configured' });
    });
  });
});

describe('nginx：/api 在 SPA location 之前明确 404（F6）', () => {
  const nginx = read('nginx/default.conf');
  // 独立复审 2026-10-14：`location ^~ /api/` 不匹配裸 /api（查询串也不参与 location 匹配），
  // 那两条会落到 location / 的 try_files → 200 SPA HTML。改成正则 location，这里断言它同时覆盖
  // /api、/api/、/api/v1/*，并且契约内容单点在 api-fail-closed.conf（default.conf 只 include）。
  const apiLocation = /location\s+~\s+\^\/api\(\/\|\$\)\s*\{([\s\S]*?)\n\s*\}/.exec(nginx);
  const spaLocationIndex = nginx.indexOf('location / {');
  const snippet = read('nginx/api-fail-closed.conf');

  /** nginx location 匹配语义的最小复刻：这里只模拟我们要断言的三条路径形态 */
  const matchesApiLocation = (pathname: string) => /^\/api(\/|$)/.test(pathname);

  it('/api location 用正则形式，覆盖裸 /api 与 /api/', () => {
    expect(apiLocation).not.toBeNull();
    expect(matchesApiLocation('/api')).toBe(true);
    expect(matchesApiLocation('/api/')).toBe(true);
    expect(matchesApiLocation('/api?x=1'.split('?')[0]!)).toBe(true);
    expect(matchesApiLocation('/api/v1/users')).toBe(true);
    // 旧前缀形式必须真的不覆盖裸 /api —— 证明这条断言不是自说自话
    const legacyMatches = (pathname: string) => pathname.startsWith('/api/');
    expect(legacyMatches('/api')).toBe(false);
    // 不能误伤 SPA 里的普通路径
    expect(matchesApiLocation('/apiary')).toBe(false);
    expect(matchesApiLocation('/dashboard')).toBe(false);
  });

  it('契约内容单点在 api-fail-closed.conf：404 + JSON、不走 try_files，且 default.conf 只 include', () => {
    const block = apiLocation?.[1] ?? '';
    expect(block).toContain('include /etc/nginx/snippets/api-fail-closed.conf');
    expect(block).not.toMatch(/try_files[\s\S]*index\.html/);
    // 契约本体在 snippet 里，且必须是 404 + JSON
    expect(snippet).toMatch(/return\s+404\s+'?\{/);
    expect(snippet).toContain('application/json');
    expect(snippet).not.toMatch(/try_files[\s\S]*index\.html/);
  });

  it('Dockerfile 把 snippet COPY 到 include 的路径（缺文件会让 nginx 起不来）', () => {
    const dockerfile = read('Dockerfile');
    expect(dockerfile).toMatch(/COPY\s+nginx\/api-fail-closed\.conf\s+\/etc\/nginx\/snippets\/api-fail-closed\.conf/);
  });

  it('/api location 排在 SPA location 之前，SPA location 保留 index.html 回退', () => {
    expect(apiLocation?.index).toBeGreaterThanOrEqual(0);
    expect(spaLocationIndex).toBeGreaterThan(apiLocation?.index ?? -1);
    expect(nginx.slice(spaLocationIndex)).toMatch(/try_files\s+\$uri\s+\$uri\/\s+\/index\.html/);
  });
});

describe('本地静态服务器（GitHub Pages 等价）：/api 闭合失败（F6）', () => {
  const startStaticHost = async (base: string) => {
    const fixture = await mkdtemp(join(tmpdir(), 'deploy-routing-'));
    fixtures.push(fixture);
    await writeFile(join(fixture, 'index.html'), 'SPA-ENTRY-MARKER');
    await writeFile(join(fixture, '404.html'), 'SPA-FALLBACK-MARKER');
    const probe = createServer();
    probe.listen(0, '127.0.0.1');
    await once(probe, 'listening');
    const { port } = probe.address() as { port: number };
    await new Promise<void>((resolve, reject) => {
      probe.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    const child = spawn(
      process.execPath,
      [fileURLToPath(new URL('serve-dist.mjs', import.meta.url)), fixture, base, String(port)],
      { stdio: 'pipe' },
    );
    children.push(child);
    let output = '';
    child.stdout.on('data', (data) => (output += data));
    child.stderr.on('data', (data) => (output += data));
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`serve-dist 启动超时: ${output}`)), 5000);
      const ready = () => {
        if (output.includes('serving ')) {
          clearTimeout(timer);
          child.stdout.off('data', ready);
          resolve();
        }
      };
      child.stdout.on('data', ready);
      child.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });
    });
    return { port, base };
  };

  const getFrom = (host: { port: number }, path: string) =>
    new Promise<{ status: number | undefined; type: string | undefined; body: string }>((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port: host.port, path, agent: false }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (data) => {
          body += data;
        });
        res.once('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body }));
      });
      req.setTimeout(2000, () => req.destroy(new Error('请求超时')));
      req.once('error', reject);
      req.end();
    });

  it.each(['/', '/umi-react-admin/'])('挂载 %s 时 /api* 返回 404 JSON，不回 SPA HTML', async (base) => {
    const host = await startStaticHost(base);
    for (const path of ['api', 'api/', 'api/v1/devices', 'api/v1/devices/all?page=1']) {
      const response = await getFrom(host, `${base}${path}`);
      expect(response.status).toBe(404);
      expect(response.type).toBe('application/json; charset=utf-8');
      expect(response.body).not.toContain('SPA-ENTRY-MARKER');
      expect(response.body).not.toContain('SPA-FALLBACK-MARKER');
      expect(JSON.parse(response.body)).toMatchObject({ error: 'not_found' });
    }
    // SPA 回退本身不能被这次收紧破坏：深链仍是 404.html/index.html 的 HTML
    expect(await getFrom(host, `${base}missing`)).toMatchObject({ status: 404, type: 'text/html' });
    expect(await getFrom(host, base)).toMatchObject({ status: 200, type: 'text/html' });
  });

  it('源码级契约：serve-dist.mjs 的 /api 守卫早于 404.html/index.html 回退且为 JSON', () => {
    const source = read('scripts/serve-dist.mjs');
    const guardIndex = source.indexOf("sitePath === 'api'");
    const fallbackIndex = source.indexOf("readDistFile(join(distRoot, '404.html'))");
    expect(guardIndex).toBeGreaterThan(-1);
    expect(fallbackIndex).toBeGreaterThan(guardIndex);
    const guard = source.slice(guardIndex, fallbackIndex);
    expect(guard).toContain('404');
    expect(guard).toContain('application/json');
  });
});
