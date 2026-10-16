import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('verify-dist-integrity.mjs', import.meta.url));

type ManifestModule = {
  MANIFEST_SCHEMA_VERSION: number;
  buildManifest: (distDir: string) => {
    schemaVersion: number;
    algorithm: string;
    fileCount: number;
    directoryCount: number;
    directories: string[];
    totalSize: number;
    files: { path: string; size: number; sha256: string }[];
  };
  validateManifest: (value: unknown) => string[];
  verifyDistIntegrity: (
    distDir: string,
    manifestPath: string,
  ) => { ok: boolean; failures: string[]; fileCount?: number; totalSize?: number };
};
const loadManifestModule = () =>
  import(/* @vite-ignore */ new URL('./verify-dist-integrity.mjs', import.meta.url).href) as Promise<ManifestModule>;

/** 以子进程运行 CLI：返回退出码与 stdout+stderr（CI 只看退出码与 ::error:: 前缀） */
const runCli = (...args: string[]) => {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  return { code: result.status ?? 1, output: `${result.stdout}${result.stderr}` };
};

const tempDirs: string[] = [];
const makeTempDir = (prefix: string) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
};

/** 生成受测产物 + 清单：返回 { dist, manifest } 及生成后的退出码/输出 */
const setup = (
  files: Record<string, string> = { 'index.html': '<html></html>', 'assets/app.js': 'console.log(1)' },
) => {
  const dir = makeTempDir('dist-integrity-');
  const dist = join(dir, 'dist');
  mkdirSync(dist, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dist, name)), { recursive: true });
    writeFileSync(join(dist, name), content);
  }
  const manifest = join(dir, 'integrity-manifest.json');
  const generated = runCli('generate', dist, manifest);
  return { dist, manifest, dir, generated };
};

describe('产物完整性清单（F10）', { timeout: 30_000 }, () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('生成清单后原样校验通过，并记录 schema/文件数/目录/总大小', async () => {
    const { dist, manifest, generated } = setup();
    expect(generated.code).toBe(0);
    expect(generated.output).toContain('完整性清单已生成');
    const parsed = JSON.parse(readFileSync(manifest, 'utf8')) as Record<string, unknown>;
    const scanner = await loadManifestModule();
    expect(parsed.schemaVersion).toBe(scanner.MANIFEST_SCHEMA_VERSION);
    expect(parsed.algorithm).toBe('sha256');
    expect(parsed.fileCount).toBe(2);
    expect(parsed.totalSize).toBe('<html></html>'.length + 'console.log(1)'.length);
    expect(parsed.directories).toEqual(['.', 'assets']);
    expect((parsed.files as { path: string }[]).map((file) => file.path)).toEqual(['assets/app.js', 'index.html']);

    const verified = runCli('verify', dist, manifest);
    expect(verified.code).toBe(0);
    expect(verified.output).toContain('产物与完整性清单一致');
  });

  it('空产物目录也能生成与校验（0 文件）', () => {
    const { dist, manifest, generated } = setup({});
    expect(generated.code).toBe(0);
    expect(runCli('verify', dist, manifest).code).toBe(0);
  });

  it('缺少清单文件时失败（发布前必须能验）', () => {
    const { dist, manifest } = setup();
    rmSync(manifest);
    const { code, output } = runCli('verify', dist, manifest);
    expect(code).toBe(1);
    expect(output).toContain('完整性清单不存在');
  });

  it('清单不是合法 JSON 时失败', () => {
    const { dist, manifest } = setup();
    writeFileSync(manifest, '{ not json');
    const { code, output } = runCli('verify', dist, manifest);
    expect(code).toBe(1);
    expect(output).toContain('不是合法 JSON');
  });

  it.each([
    ['schemaVersion 版本不符', { schemaVersion: 99 }],
    ['files 不是数组', { files: 'nope' }],
    ['sha256 不是摘要', { files: [{ path: 'a.js', size: 1, sha256: 'zz' }] }],
    ['路径是绝对路径', { files: [{ path: '/etc/passwd', size: 1, sha256: 'a'.repeat(64) }] }],
    ['路径含 ..', { files: [{ path: '../outside.txt', size: 1, sha256: 'a'.repeat(64) }] }],
    [
      '路径重复',
      {
        files: [
          { path: 'a.js', size: 1, sha256: 'a'.repeat(64) },
          { path: 'a.js', size: 1, sha256: 'b'.repeat(64) },
        ],
      },
    ],
    ['fileCount 与实际条数不符', { fileCount: 5 }],
    ['totalSize 与逐文件之和不符', { totalSize: 999 }],
    ['directories 不是相对目录数组', { directories: ['/abs'] }],
    ['directoryCount 与 directories 不符', { directoryCount: 42 }],
  ])('清单结构不合法（%s）时失败', async (_label, patch) => {
    const { dist, manifest } = setup();
    const original = JSON.parse(readFileSync(manifest, 'utf8')) as Record<string, unknown>;
    writeFileSync(manifest, JSON.stringify({ ...original, ...patch }));
    const { code, output } = runCli('verify', dist, manifest);
    expect(code).toBe(1);
    expect(output).toContain('完整性清单结构不合法');
  });

  it('产物缺少清单里登记的文件时失败，并报出总大小变化', () => {
    const { dist, manifest } = setup();
    rmSync(join(dist, 'index.html'));
    const { code, output } = runCli('verify', dist, manifest);
    expect(code).toBe(1);
    expect(output).toContain('产物缺少清单里登记的文件');
    expect(output).toContain('index.html');
    expect(output).toContain('产物体积与清单不一致');
  });

  it('产物多出清单之外的文件时失败', () => {
    const { dist, manifest } = setup();
    writeFileSync(join(dist, 'injected.js'), 'evil');
    const { code, output } = runCli('verify', dist, manifest);
    expect(code).toBe(1);
    expect(output).toContain('产物出现清单之外的文件');
    expect(output).toContain('injected.js');
  });

  it('文件内容变化（大小相同）时失败，并列出 sha256 变化', () => {
    const { dist, manifest } = setup();
    writeFileSync(join(dist, 'index.html'), '<html></html>'.replace('<html>', '<HTML>')); // 同样 13 字节
    const { code, output } = runCli('verify', dist, manifest);
    expect(code).toBe(1);
    expect(output).toContain('产物文件内容与清单不一致');
    expect(output).toContain('index.html');
    expect(output).toContain('sha256');
  });

  it('文件大小变化时失败', () => {
    const { dist, manifest } = setup();
    writeFileSync(join(dist, 'assets/app.js'), 'console.log(1);console.log(2)');
    const { code, output } = runCli('verify', dist, manifest);
    expect(code).toBe(1);
    expect(output).toContain('大小');
    expect(output).toContain('assets/app.js');
  });

  it('产物目录结构变化时失败（多出目录 / 缺少目录）', () => {
    const { dist, manifest } = setup();
    mkdirSync(join(dist, 'extra-dir'));
    const extra = runCli('verify', dist, manifest);
    expect(extra.code).toBe(1);
    expect(extra.output).toContain('产物出现清单之外的目录');
    expect(extra.output).toContain('extra-dir');

    const original = JSON.parse(readFileSync(manifest, 'utf8')) as Record<string, unknown>;
    writeFileSync(
      manifest,
      JSON.stringify({
        ...original,
        directories: [...(original.directories as string[]), 'ghost'],
        directoryCount: (original.directoryCount as number) + 1,
      }),
    );
    const missing = runCli('verify', dist, manifest);
    expect(missing.code).toBe(1);
    expect(missing.output).toContain('产物缺少清单里登记的目录');
    expect(missing.output).toContain('ghost');
  });

  it('生成时产物含符号链接直接失败（不把链接目标当发布字节）', () => {
    const { dist } = setup();
    const outside = join(dist, '..', 'outside.txt');
    writeFileSync(outside, 'outside');
    symlinkSync(outside, join(dist, 'link.txt'));
    const { code, output } = runCli('generate', dist, join(dist, '..', 'm.json'));
    expect(code).toBe(1);
    expect(output).toContain('符号链接');
    expect(output).toContain('link.txt');
  });

  it('生成后注入符号链接，校验失败', () => {
    const { dist, manifest } = setup();
    symlinkSync(join(dist, 'index.html'), join(dist, 'alias.html'));
    const { code, output } = runCli('verify', dist, manifest);
    expect(code).toBe(1);
    expect(output).toContain('符号链接');
    expect(output).toContain('alias.html');
  });

  it('清单不能写在产物目录内（generate 与 verify 都拒绝）', () => {
    const { dist } = setup();
    const inside = join(dist, 'integrity-manifest.json');
    const generated = runCli('generate', dist, inside);
    expect(generated.code).toBe(1);
    expect(generated.output).toContain('清单不能写在产物目录内');
    const verified = runCli('verify', dist, inside);
    expect(verified.code).toBe(1);
    expect(verified.output).toContain('清单不能写在产物目录内');
  });

  it('候选清单被改写后再校验必然失败（防「清单与产物一起被替换」的假通过）', () => {
    const { dist, manifest } = setup();
    const tampered = JSON.parse(readFileSync(manifest, 'utf8')) as { files: { path: string; sha256: string }[] };
    tampered.files[0].sha256 = 'b'.repeat(64);
    writeFileSync(manifest, JSON.stringify(tampered));
    const { code, output } = runCli('verify', dist, manifest);
    expect(code).toBe(1);
    expect(output).toContain('sha256');
  });

  it('缺少参数时退出码非 0 并给出用法', () => {
    const dir = makeTempDir('dist-integrity-');
    expect(runCli().code).toBe(1);
    expect(runCli('verify', dir).code).toBe(1);
    expect(runCli('frobnicate', dir).output).toContain('用法');
  });

  it('产物目录不存在时失败', () => {
    const dir = makeTempDir('dist-integrity-');
    const { code, output } = runCli('generate', join(dir, 'missing'));
    expect(code).toBe(1);
    expect(output).toContain('不存在');
  });

  it('buildManifest 与 verifyDistIntegrity 可直接复用（纯函数，失败不抛异常）', async () => {
    const scanner = await loadManifestModule();
    const { dist, manifest } = setup();
    const manifestObject = scanner.buildManifest(dist);
    expect(manifestObject.fileCount).toBe(2);
    expect(scanner.validateManifest(manifestObject)).toEqual([]);
    expect(scanner.verifyDistIntegrity(dist, manifest).ok).toBe(true);
    const corrupt = { ...manifestObject, totalSize: manifestObject.totalSize + 1 };
    expect(scanner.validateManifest(corrupt).length).toBeGreaterThan(0);
    expect(scanner.verifyDistIntegrity(dist, join(dirname(manifest), 'missing.json')).ok).toBe(false);
  });
});

describe('deploy.yml 的发布前校验接线（F10）', { timeout: 30_000 }, () => {
  const deployWorkflow = readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');

  it('顺序为：扫描 → 生成清单 → 上传 → 下载 → 校验 → 发布', () => {
    const anchors = [
      'scripts/check-dist-secrets.mjs',
      'verify-dist-integrity.mjs generate',
      'Upload checked static files',
      'Download checked static files',
      'verify-dist-integrity.mjs verify',
      'uses: peaceiris/actions-gh-pages',
    ];
    const positions = anchors.map((anchor) => deployWorkflow.indexOf(anchor));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });

  it('清单随 artifact 上传，下载后先比对清单指纹、再逐文件校验', () => {
    expect(deployWorkflow).toContain('integrity-manifest.json');
    expect(deployWorkflow).toContain('manifest-sha256');
    expect(deployWorkflow).toContain('include-hidden-files: true');
    expect(deployWorkflow).toContain('EXPECTED_MANIFEST_SHA256');
    // 校验步骤必须紧邻发布步骤之前，中间不能再插会改动 dist 的步骤
    const verifyIndex = deployWorkflow.indexOf('verify-dist-integrity.mjs verify');
    const publishIndex = deployWorkflow.indexOf('uses: peaceiris/actions-gh-pages');
    expect(publishIndex).toBeGreaterThan(verifyIndex);
    expect(deployWorkflow.slice(verifyIndex, publishIndex)).not.toContain('run:');
  });
});
