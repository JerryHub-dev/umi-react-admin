// 纯静态服务器，行为对齐 GitHub Pages：站点挂在子路径下，不存在的路径返回 404.html（状态码 404）。
// 用于 E2E 与本地验证纯静态部署（不要用 max preview：它自带 mock 与 history fallback，会掩盖静态托管的问题）。
// 用法：node scripts/serve-dist.mjs [dist 目录] [base 路径] [端口] [监听地址，默认 127.0.0.1]
import { readFile, realpath, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
const dist = process.argv[2] ?? 'dist';
const base = process.argv[3] ?? '/umi-react-admin/';
const port = Number(process.argv[4] ?? 8090);
const host = process.argv[5] ?? '127.0.0.1';
const distRoot = resolve(dist);
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.woff2': 'font/woff2',
  '.bcmap': 'application/octet-stream',
  '.pfb': 'application/octet-stream',
  '.ttf': 'font/ttf',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.xml': 'application/xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};
class OutsideDistError extends Error {}

const isInside = (root, file) => {
  const path = relative(root, file);
  return !isAbsolute(path) && path !== '..' && !path.startsWith(`..${sep}`);
};

// 所有读取（含目录入口与 SPA 回退）共享同一边界；读取已检查的真实路径，避免再次跟随原始链接。
const checkedPath = async (file) => {
  if (!isInside(distRoot, file)) throw new OutsideDistError();
  const root = await realpath(distRoot);
  const target = await realpath(file);
  if (!isInside(root, target)) throw new OutsideDistError();
  return target;
};
const readDistFile = async (file) => readFile(await checkedPath(file));

const serve = async (req, res) => {
  let url;
  try {
    url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (url.includes('\0')) throw new URIError();
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  // 静态宿主不实现 API：/api* 必须明确失败（404 + JSON），绝不能把 SPA HTML 当成接口响应（F6）。
  // 与 nginx 的 `location ~ ^/api(/|$)`、vercel.json 的 /api 规则、public/_redirects（Cloudflare Pages）是同一契约，
  // 三条产线的比对回归见 scripts/deploy-routing.test.ts。
  const sitePath = url.startsWith(base) ? url.slice(base.length) : url.replace(/^\//, '');
  if (sitePath === 'api' || sitePath.startsWith('api/')) {
    res.writeHead(404, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify({ error: 'not_found', message: 'static host has no API backend' }));
    return;
  }
  if (!url.startsWith(base)) {
    res.writeHead(404);
    res.end();
    return;
  }
  let file = join(distRoot, url.slice(base.length));
  try {
    if ((await stat(await checkedPath(file))).isDirectory()) file = join(file, 'index.html');
    const body = await readDistFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch (error) {
    if (error instanceof OutsideDistError) {
      res.writeHead(403);
      res.end();
      return;
    }
    // GitHub Pages 的 SPA 回退：部署时复制 index.html 为 404.html；本地产物没有时直接用 index.html
    const fallback = await readDistFile(join(distRoot, '404.html')).catch(() =>
      readDistFile(join(distRoot, 'index.html')).catch(() => null),
    );
    res.writeHead(404, { 'content-type': 'text/html' });
    res.end(fallback ?? '');
  }
};

createServer((req, res) => {
  serve(req, res).catch(() => {
    if (res.headersSent) res.destroy();
    else {
      res.writeHead(500);
      res.end();
    }
  });
}).listen(port, host, () => console.log(`serving ${dist} at http://${host}:${port}${base}`));
