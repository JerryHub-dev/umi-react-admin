import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('serve-dist.mjs', import.meta.url));
const outside = 'outside-fixture-must-never-be-served';
const children: ReturnType<typeof spawn>[] = [];
let fixture: string;
let dist: string;

beforeEach(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'serve-dist-'));
  dist = join(fixture, 'dist');
  await mkdir(join(dist, 'docs'), { recursive: true });
  await mkdir(join(fixture, 'dist-other'));
  await writeFile(join(dist, 'index.html'), 'entry');
  await writeFile(join(dist, '404.html'), 'fallback');
  await writeFile(join(dist, 'app.js'), 'app');
  await writeFile(join(dist, 'docs/index.html'), 'directory-entry');
  await writeFile(join(dist, '地图 % 图.txt'), 'encoded-filename');
  await writeFile(join(dist, '%2e%2e%2foutside.txt'), 'single-decode');
  await writeFile(join(fixture, 'outside.txt'), outside);
  await writeFile(join(fixture, 'dist-other/index.html'), outside);
});

afterEach(async () => {
  for (const child of children.splice(0)) {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, 'close');
      child.kill();
      await closed;
    }
  }
  await rm(fixture, { recursive: true, force: true });
});

const start = async (base: string, directory = dist, host?: string) => {
  // 使用操作系统分配的端口，真实 CLI 仍通过既有的端口参数启动。
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>((resolve, reject) => {
    probe.close((error) => (error ? reject(error) : resolve()));
  });

  const child = spawn(process.execPath, [script, directory, base, String(port), ...(host ? [host] : [])], {
    cwd: fixture,
    stdio: 'pipe',
  });
  children.push(child);
  let output = '';
  child.stdout.on('data', (data) => (output += data));
  child.stderr.on('data', (data) => (output += data));
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Server startup timed out: ${output}`)), 5000);
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
    child.once('exit', () => {
      clearTimeout(timer);
      reject(new Error(`Server exited before readiness: ${output}`));
    });
  });
  return { child, port, output: () => output };
};

const get = (server: Awaited<ReturnType<typeof start>>, path: string) =>
  new Promise<{ status: number | undefined; type: string | undefined; body: string }>((resolve, reject) => {
    // 保留原始 request target，避免 fetch/URL 在发出前消除恶意路径段。
    const req = request({ hostname: '127.0.0.1', port: server.port, path, agent: false }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (data) => (body += data));
      res.once('error', reject);
      res.once('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body }));
    });
    req.setTimeout(2000, () => req.destroy(new Error('Request timed out')));
    req.once('error', reject);
    req.end();
  });

const healthy = async (server: Awaited<ReturnType<typeof start>>, base: string) => {
  expect(await get(server, `${base}app.js`)).toEqual({ status: 200, type: 'text/javascript', body: 'app' });
  expect(server.child.exitCode).toBeNull();
  expect(server.child.signalCode).toBeNull();
};

describe.each(['/', '/umi-react-admin/'])('静态预览挂载 %s', (base) => {
  it('保留文件、MIME、目录入口、query 与单次解码行为', async () => {
    const server = await start(base);
    await healthy(server, base);
    expect(await get(server, base)).toMatchObject({ status: 200, type: 'text/html', body: 'entry' });
    expect(await get(server, `${base}docs/`)).toMatchObject({ status: 200, body: 'directory-entry' });
    expect(await get(server, `${base}app.js?invalid=%`)).toMatchObject({ status: 200, body: 'app' });
    expect(await get(server, `${base}${encodeURIComponent('地图 % 图.txt')}`)).toMatchObject({
      status: 200,
      type: 'application/octet-stream',
      body: 'encoded-filename',
    });
    expect(await get(server, `${base}%252e%252e%252foutside.txt`)).toMatchObject({
      status: 200,
      body: 'single-decode',
    });
    expect(server.output()).toContain(`http://127.0.0.1:${server.port}`);
  });

  it.each(['..%2foutside.txt', '%2e%2e%2foutside.txt', '..%2Fdist-other%2Findex.html', '..%2f..%2foutside.txt'])(
    '拒绝编码遍历 %s，并继续服务',
    async (path) => {
      const server = await start(base);
      const response = await get(server, `${base}${path}`);
      expect(response.status).toBe(403);
      expect(response.body).not.toContain(outside);
      await healthy(server, base);
    },
  );

  it.each(['%', '%2', '%GG', '%C0%AF', '%E0%A4', '%FF', '%00'])('畸形路径 %s 返回 400，进程仍能响应', async (path) => {
    const server = await start(base);
    expect(await get(server, `${base}${path}`)).toMatchObject({ status: 400, body: '' });
    await healthy(server, base);
  });

  it('拒绝文件、目录和目录 index 的外部符号链接', async () => {
    await symlink(join(fixture, 'outside.txt'), join(dist, 'file-link'));
    await symlink(join(fixture, 'dist-other'), join(dist, 'directory-link'));
    await mkdir(join(dist, 'index-link'));
    await symlink(join(fixture, 'outside.txt'), join(dist, 'index-link/index.html'));
    const server = await start(base);
    for (const path of ['file-link', 'directory-link/', 'directory-link/index.html', 'index-link/']) {
      const response = await get(server, `${base}${path}`);
      expect(response.status).toBe(403);
      expect(response.body).not.toContain(outside);
      await healthy(server, base);
    }
  });

  it('允许站内符号链接、链接根目录，并保持逻辑请求的 MIME', async () => {
    await writeFile(join(dist, 'inside.txt'), 'inside');
    await symlink(join(dist, 'inside.txt'), join(dist, 'alias.js'));
    await symlink(join(dist, 'docs'), join(dist, 'internal-directory'));
    await symlink(dist, join(fixture, 'dist-link'));
    const server = await start(base, join(fixture, 'dist-link'), '127.0.0.1');
    expect(await get(server, `${base}alias.js`)).toEqual({ status: 200, type: 'text/javascript', body: 'inside' });
    expect(await get(server, `${base}internal-directory/`)).toMatchObject({ status: 200, body: 'directory-entry' });
    await healthy(server, base);
  });

  it('/api* 闭合失败：404 + JSON，绝不回 SPA HTML（F6）', async () => {
    const server = await start(base);
    for (const path of ['api', 'api/', 'api/v1/devices', 'api/v1/devices/all?page=1']) {
      const response = await get(server, `${base}${path}`);
      expect(response.status).toBe(404);
      expect(response.type).toBe('application/json; charset=utf-8');
      expect(JSON.parse(response.body)).toMatchObject({ error: 'not_found' });
      expect(response.body).not.toContain('entry');
      expect(response.body).not.toContain('fallback');
    }
    await healthy(server, base);
  });

  it('保留 404.html → index.html → 空 404 回退顺序', async () => {
    const server = await start(base);
    expect(await get(server, `${base}missing`)).toEqual({ status: 404, type: 'text/html', body: 'fallback' });
    await rm(join(dist, '404.html'));
    expect(await get(server, `${base}missing`)).toMatchObject({ status: 404, body: 'entry' });
    await mkdir(join(dist, '404.html'));
    await writeFile(join(dist, '404.html/index.html'), 'not-a-fallback-file');
    expect(await get(server, `${base}missing`)).toMatchObject({ status: 404, body: 'entry' });
    await rm(join(dist, 'index.html'));
    expect(await get(server, `${base}missing`)).toMatchObject({ status: 404, body: '' });
    await healthy(server, base);
  });

  it('SPA 回退文件不能通过符号链接返回目录外内容', async () => {
    await rm(join(dist, '404.html'));
    await symlink(join(fixture, 'outside.txt'), join(dist, '404.html'));
    const server = await start(base);
    expect(await get(server, `${base}missing`)).toMatchObject({ status: 404, body: 'entry' });
    await rm(join(dist, 'index.html'));
    await symlink(join(fixture, 'outside.txt'), join(dist, 'index.html'));
    expect(await get(server, `${base}missing`)).toMatchObject({ status: 404, body: '' });
    expect(await get(server, base)).toMatchObject({ status: 403, body: '' });
    await healthy(server, base);
  });
});

it('子路径外请求不使用 SPA 回退，/api 仍为 JSON 404，畸形请求仍返回 400', async () => {
  const server = await start('/umi-react-admin/');
  expect(await get(server, '/umi-react-admin-other/app.js')).toMatchObject({ status: 404, body: '' });
  expect(await get(server, '/umi-react-admin')).toMatchObject({ status: 404, body: '' });
  expect(await get(server, '/api/v1/users')).toMatchObject({ status: 404, type: 'application/json; charset=utf-8' });
  expect(await get(server, '/%')).toMatchObject({ status: 400, body: '' });
  await healthy(server, '/umi-react-admin/');
});

it('构建目录不存在时仍返回空 404', async () => {
  const server = await start('/', join(fixture, 'not-built'));
  expect(await get(server, '/missing')).toMatchObject({ status: 404, body: '' });
  expect(server.child.exitCode).toBeNull();
});
