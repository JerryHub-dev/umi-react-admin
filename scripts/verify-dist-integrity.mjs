// 产物完整性清单（审计 F10）：把「被扫描的字节」与「被发布的字节」绑定。
// 背景：GitHub Pages 产线在 build job 里扫描 dist、作为 artifact 上传，deploy job 下载后直接发布——
// 没有任何证据表明「发布的字节」就是「扫描过的字节」（上传/下载损坏、artifact 被替换、目录错位都无感）。
//
// 用法：
//   node scripts/verify-dist-integrity.mjs generate <产物目录> [清单路径]
//   node scripts/verify-dist-integrity.mjs verify   <产物目录> <清单路径>
//
// generate：逐文件记录稳定相对路径、字节数、sha256，另记清单 schema 版本、文件数、目录结构、总字节数。
//           产物含符号链接或非普通文件直接判失败（清单描述的是真实发布树，不是链接指向的目标）。
// verify  ：清单缺失/损坏/结构不合法，或产物出现「缺文件、多文件、文件内容或大小变化、符号链接、
//           总大小变化、目录结构变化」都判失败（退出码 1，`::error::` 前缀便于 CI 标注）。
// 清单必须写在产物目录之外：清单自身不（也不该）列进清单，写进去会永远被判为「多余文件」。
// 输出只含路径、字节数与 sha256，不含文件内容。
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MANIFEST_SCHEMA_VERSION = 1;
/** 失败清单的路径列表上限：几百个文件全量打印会把 CI 日志淹没 */
export const MAX_LISTED = 20;

const root = fileURLToPath(new URL('..', import.meta.url));
const SHA256_RE = /^[0-9a-f]{64}$/;
const PATH_SEGMENT_RE = /^[^/\\]+$/;

/** 仓库内路径显示为相对路径，仓库外（如测试临时目录）显示绝对路径 */
const display = (path) => {
  const rel = relative(root, path);
  return rel && !rel.startsWith('..') ? rel : path;
};

/** 产物树里的一个「不合规条目」：符号链接/非普通文件/清单位置错误，一律不进入比较流程 */
class IntegrityError extends Error {}

const byPath = (left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0);

const hashFile = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

/** 是否为稳定的相对路径（拒绝绝对路径、`..`、`.` 段、空段与反斜杠） */
const isRelativePath = (value) =>
  typeof value === 'string' && value.length > 0 && !value.startsWith('/') && !value.includes('\\')
    ? value.split('/').every((segment) => PATH_SEGMENT_RE.test(segment) && segment !== '.' && segment !== '..')
    : false;

const isRelativeDirectory = (value) => value === '.' || isRelativePath(value);

/**
 * 遍历产物树：返回 { files: [{ path, size, absolute }], directories: [相对目录] }。
 * 符号链接与非普通文件（FIFO/socket/设备）直接抛错——它们不是可发布的静态字节。
 */
export const walkTree = (dir) => {
  const files = [];
  const directories = [];
  const visit = (current, prefix) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = join(current, entry.name);
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isSymbolicLink()) throw new IntegrityError(`产物含符号链接（拒绝）：${path}`);
      if (entry.isDirectory()) {
        directories.push(path);
        visit(absolute, path);
        continue;
      }
      if (!entry.isFile()) throw new IntegrityError(`产物含非普通文件（拒绝）：${path}`);
      files.push({ path, size: lstatSync(absolute).size, absolute });
    }
  };
  visit(dir, '');
  files.sort(byPath);
  directories.sort();
  return { files, directories };
};

/** 生成清单对象（纯函数，不写盘）：稳定排序，便于逐字节比对与复现 */
export const buildManifest = (distDir) => {
  const { files, directories } = walkTree(distDir);
  const entries = files.map((file) => ({ path: file.path, size: file.size, sha256: hashFile(file.absolute) }));
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    algorithm: 'sha256',
    fileCount: entries.length,
    directoryCount: directories.length + 1,
    directories: ['.', ...directories],
    totalSize: entries.reduce((sum, entry) => sum + entry.size, 0),
    files: entries,
  };
};

/** 清单结构校验：返回问题列表（空数组即合法）。清单本身就是信任锚，字段必须严格 */
export const validateManifest = (value) => {
  const problems = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['清单不是 JSON 对象'];
  if (value.schemaVersion !== MANIFEST_SCHEMA_VERSION) {
    problems.push(`schemaVersion 必须是 ${MANIFEST_SCHEMA_VERSION}，实际 ${JSON.stringify(value.schemaVersion)}`);
  }
  if (value.algorithm !== 'sha256') problems.push(`algorithm 必须是 sha256，实际 ${JSON.stringify(value.algorithm)}`);
  if (!Array.isArray(value.files)) {
    problems.push('files 必须是数组');
    return problems;
  }
  const seen = new Set();
  let totalSize = 0;
  for (const [index, entry] of value.files.entries()) {
    const where = `files[${index}]`;
    if (!entry || typeof entry !== 'object') {
      problems.push(`${where} 不是对象`);
      continue;
    }
    if (!isRelativePath(entry.path)) {
      problems.push(`${where}.path 不是稳定的相对路径：${JSON.stringify(entry.path)}`);
    } else if (seen.has(entry.path)) {
      problems.push(`${where}.path 重复：${entry.path}`);
    } else {
      seen.add(entry.path);
    }
    if (!Number.isSafeInteger(entry.size) || entry.size < 0) problems.push(`${where}.size 不是非负整数`);
    else totalSize += entry.size;
    if (typeof entry.sha256 !== 'string' || !SHA256_RE.test(entry.sha256)) {
      problems.push(`${where}.sha256 不是 sha256 十六进制摘要`);
    }
  }
  if (value.fileCount !== value.files.length) {
    problems.push(`fileCount（${JSON.stringify(value.fileCount)}）与 files 数量（${value.files.length}）不一致`);
  }
  if (value.totalSize !== totalSize) {
    problems.push(`totalSize（${JSON.stringify(value.totalSize)}）与逐文件大小之和（${totalSize}）不一致`);
  }
  if (!Array.isArray(value.directories) || !value.directories.every(isRelativeDirectory)) {
    problems.push('directories 必须是相对目录路径数组（根目录为 "."）');
  } else if (new Set(value.directories).size !== value.directories.length) {
    problems.push('directories 含重复目录');
  } else if (value.directoryCount !== value.directories.length) {
    problems.push(`directoryCount（${JSON.stringify(value.directoryCount)}）与 directories 数量不一致`);
  }
  return problems;
};

const listPaths = (label, paths, failures) => {
  if (!paths.length) return;
  failures.push(
    `${label} ${paths.length} 个：${paths.slice(0, MAX_LISTED).join('、')}${paths.length > MAX_LISTED ? `…另 ${paths.length - MAX_LISTED} 个` : ''}`,
  );
};

/**
 * 校验产物与清单一致。返回 { ok, failures, fileCount, totalSize, manifestDigest }。
 * 纯函数（只读）：失败清单不抛异常，由 CLI 决定退出码，测试可直接断言。
 */
export const verifyDistIntegrity = (distDir, manifestPath) => {
  if (!existsSync(manifestPath)) {
    return { ok: false, failures: [`完整性清单不存在：${display(manifestPath)}`] };
  }
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    return {
      ok: false,
      failures: [`完整性清单不是合法 JSON：${error instanceof Error ? error.message : String(error)}`],
    };
  }
  const problems = validateManifest(manifest);
  if (problems.length) {
    return { ok: false, failures: problems.map((problem) => `完整性清单结构不合法：${problem}`) };
  }

  let tree;
  try {
    tree = walkTree(distDir);
  } catch (error) {
    return { ok: false, failures: [error instanceof Error ? error.message : String(error)] };
  }

  const failures = [];
  const expected = new Map(manifest.files.map((entry) => [entry.path, entry]));
  const actual = new Map(tree.files.map((file) => [file.path, file]));
  listPaths(
    '产物缺少清单里登记的文件',
    [...expected.keys()].filter((path) => !actual.has(path)),
    failures,
  );
  listPaths(
    '产物出现清单之外的文件',
    [...actual.keys()].filter((path) => !expected.has(path)),
    failures,
  );
  const changed = [];
  for (const [path, entry] of expected) {
    const file = actual.get(path);
    if (!file) continue;
    if (file.size !== entry.size) {
      changed.push(`${path}（大小 ${entry.size} → ${file.size}）`);
      continue;
    }
    const digest = hashFile(file.absolute);
    if (digest !== entry.sha256)
      changed.push(`${path}（sha256 ${entry.sha256.slice(0, 12)} → ${digest.slice(0, 12)}）`);
  }
  listPaths('产物文件内容与清单不一致', changed, failures);

  const expectedDirs = new Set(manifest.directories);
  const actualDirs = new Set(['.', ...tree.directories]);
  listPaths(
    '产物缺少清单里登记的目录',
    [...expectedDirs].filter((path) => !actualDirs.has(path)),
    failures,
  );
  listPaths(
    '产物出现清单之外的目录',
    [...actualDirs].filter((path) => !expectedDirs.has(path)),
    failures,
  );

  const totalSize = tree.files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize !== manifest.totalSize) {
    failures.push(`产物体积与清单不一致：清单 ${manifest.totalSize} 字节，实际 ${totalSize} 字节`);
  }
  if (tree.files.length !== manifest.fileCount) {
    failures.push(`产物文件数与清单不一致：清单 ${manifest.fileCount} 个，实际 ${tree.files.length} 个`);
  }

  return {
    ok: failures.length === 0,
    failures,
    fileCount: tree.files.length,
    totalSize,
    manifestDigest: hashFile(manifestPath),
  };
};

/** 清单必须写在产物目录之外：清单自身不在清单里，写进去 verify 会永远判「多余文件」 */
const assertManifestOutside = (distDir, manifestPath) => {
  const rel = relative(distDir, manifestPath);
  if (rel && !rel.startsWith('..')) {
    throw new IntegrityError(`清单不能写在产物目录内（${display(distDir)}）：清单自身不在清单里，verify 会永远判失败`);
  }
};

const writeManifest = (distDir, manifestPath) => {
  const manifest = buildManifest(distDir);
  const temporary = `${manifestPath}.tmp-${process.pid}`;
  try {
    writeFileSync(temporary, `${JSON.stringify(manifest, null, 2)}\n`);
    renameSync(temporary, manifestPath);
  } catch (error) {
    rmSync(temporary, { force: true });
    throw error;
  }
  return { manifest, digest: hashFile(manifestPath) };
};

const fail = (message) => {
  console.error(`::error::${message}`);
  process.exit(1);
};

const usage = () => {
  fail(
    '用法：node scripts/verify-dist-integrity.mjs generate <产物目录> [清单路径]\n' +
      '      node scripts/verify-dist-integrity.mjs verify   <产物目录> <清单路径>',
  );
};

export const main = (argv) => {
  const [command, distArg, manifestArg] = argv;
  if (!command || !distArg) usage();
  const distDir = resolve(distArg);
  if (!existsSync(distDir)) fail(`${display(distDir)} 不存在，请先构建`);
  try {
    if (command === 'generate') {
      const manifestPath = resolve(manifestArg ?? join(dirname(distDir), 'integrity-manifest.json'));
      assertManifestOutside(distDir, manifestPath);
      const { manifest, digest } = writeManifest(distDir, manifestPath);
      console.log(
        `完整性清单已生成：${display(manifestPath)}（schema v${MANIFEST_SCHEMA_VERSION}，` +
          `${manifest.fileCount} 个文件，${manifest.totalSize} 字节，清单指纹 ${digest.slice(0, 12)}）`,
      );
      return;
    }
    if (command === 'verify') {
      if (!manifestArg) usage();
      const manifestPath = resolve(manifestArg);
      assertManifestOutside(distDir, manifestPath);
      const result = verifyDistIntegrity(distDir, manifestPath);
      if (!result.ok) {
        for (const message of result.failures) console.error(`  ✗ ${message}`);
        fail('产物与完整性清单不一致：拒绝发布未经校验的字节');
      }
      console.log(
        `✅ 产物与完整性清单一致：${display(distDir)}（${result.fileCount} 个文件，` +
          `${result.totalSize} 字节，清单指纹 ${result.manifestDigest.slice(0, 12)}）`,
      );
      return;
    }
    usage();
  } catch (error) {
    if (error instanceof IntegrityError) fail(error.message);
    throw error;
  }
};

/** 只有直接执行才跑主流程，被测试 import 时不执行 */
const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) main(process.argv.slice(2));
