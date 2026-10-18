import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const script = fileURLToPath(new URL('check-dist-secrets.mjs', import.meta.url));

// 与被测脚本同样经 cesium 包解析 @cesium/engine（传递依赖，不依赖 node_modules 提升）
const requireFromCesium = createRequire(createRequire(import.meta.url).resolve('cesium/package.json'));
const ionSource = readFileSync(
  join(dirname(requireFromCesium.resolve('@cesium/engine/package.json')), 'Source/Core/Ion.js'),
  'utf8',
);
const cesiumDefaultToken = /defaultAccessToken\s*=\s*["'`]([^"'`]+)["'`]/.exec(ionSource)?.[1] ?? '';

// 伪造的凭据在运行时拼出，仓库文件里不出现 JWT 字面量（见 repo-hygiene.test.ts）
const b64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const fakeJwt = [
  b64url({ alg: 'HS256', typ: 'JWT' }),
  b64url({ sub: 'fixture-only-not-a-secret' }),
  Buffer.from('signature-placeholder').toString('base64url'),
].join('.');
const otherJwt = [
  b64url({ alg: 'HS256', typ: 'JWT' }),
  b64url({ sub: 'fixture-other-declaration' }),
  Buffer.from('other-signature-placeholder').toString('base64url'),
].join('.');
/** 高德 Key/安全密钥是 32 位十六进制；用摘要派生假值，仓库里不留可被误认的字面量 */
const fakeAmapKey = createHash('sha256').update('fixture-amap-key').digest('hex').slice(0, 32);
const otherAmapKey = createHash('sha256').update('fixture-other-amap-key').digest('hex').slice(0, 32);
const fakeAmapSecurityCode = createHash('sha256').update('fixture-amap-security-code').digest('hex').slice(0, 32);
/** AWS Access Key 形态（AKIA + 16 位大写字母数字）同样摘要派生：夹具需真实形态，仓库不留凭据字面量 */
const fakeAwsKeyId = `AKIA${createHash('sha256')
  .update('fixture-aws-key')
  .digest('base64')
  .toUpperCase()
  .replace(/[^A-Z0-9]/g, '')
  .slice(0, 16)}`;

const tempDirs: string[] = [];
const makeDist = (files: Record<string, string>) => {
  const dir = mkdtempSync(join(tmpdir(), 'dist-secrets-'));
  tempDirs.push(dir);
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
};

/**
 * 与凭据门禁相关的环境变量：构建期凭据、EXPECTED_* 声明、umi 隐式注入的 UMI_APP_*。
 * 子进程环境必须剔除它们——开发者 shell 里导出的 CESIUM_ION_TOKEN 等不能改变用例结论
 * （下方有用例核对这份名单覆盖登记表里的全部变量名）。
 */
const SCANNER_ENV_RE = /^(?:UMI_APP_|EXPECTED_)|^(?:CESIUM_ION_TOKEN|AMAP_KEY|AMAP_SECURITY_CODE)$/;
const isolatedEnv = () =>
  Object.fromEntries(Object.entries(process.env).filter(([name]) => !SCANNER_ENV_RE.test(name)));

/**
 * 以子进程运行门禁脚本，返回退出码与全部输出（stdout+stderr）；extraEnv 可传 EXPECTED_* 等环境变量。
 * cwd 是一个空目录：扫描器按 umi 的口径读取 cwd 下的 .env / .env.local，仓库根目录的本地文件不能混进用例。
 */
const runScan = (distDir: string, extraEnv: Record<string, string> = {}, cwd = makeDist({})) => {
  // 子进程参数形状闸门：首字符不得为「-」（防选项注入；绝对路径的 / 合法），路径字符之外一律拒绝
  const SAFE_SPAWN_ARG = /^[A-Za-z0-9_@./][/A-Za-z0-9_@.-]*$/;
  for (const arg of [script, distDir, cwd]) {
    if (!SAFE_SPAWN_ARG.test(arg)) throw new Error(`不安全的子进程参数形态: ${arg.slice(0, 32)}`);
  }
  const result = spawnSync(process.execPath, [script, distDir], {
    encoding: 'utf8',
    cwd,
    env: { ...isolatedEnv(), ...extraEnv },
  });
  return { code: result.status ?? 1, output: `${result.stdout}${result.stderr}` };
};

/** 直接 import 模块的纯函数（不经过 CLI），用于核对 define 块解析与登记表漂移 */
type ScanOptions = { readModule?: (specifier: string) => string | undefined };
type ScannerModule = {
  CREDENTIAL_DECLARATIONS: { define: string; declaration: string; alias?: string }[];
  PUBLIC_ENV_DEFINES: Record<string, string>;
  PUBLIC_UMI_APP_VARS: Record<string, string>;
  parseDefineEntries: (
    source: string,
    options?: ScanOptions,
  ) => { name: string; expression: string; referencesEnv: boolean }[];
  findEnvBackedDefines: (source: string, options?: ScanOptions) => string[];
  findImplicitEnvChannel: (options: { env: Record<string, string | undefined>; envFileNames?: string[] }) => string[];
  evaluateDeclarations: (options: { env: Record<string, string>; envBackedDefines: string[] }) => {
    failures: string[];
    warnings: string[];
    entries: { type: string; valid: boolean }[];
  };
};
const loadScanner = () =>
  import(/* @vite-ignore */ new URL('./check-dist-secrets.mjs', import.meta.url).href) as Promise<ScannerModule>;

describe('产物凭据扫描（JWT 白名单）', { timeout: 30_000 }, () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('能从已安装的 Cesium 源码读到默认 token（白名单来源）', () => {
    expect(cesiumDefaultToken).toMatch(/^eyJ[\w-]+\.eyJ[\w-]+\.[\w-]+$/);
  });

  it('只含 Cesium 默认 token 时通过', () => {
    const { code, output } = runScan(makeDist({ 'cesium.js': `var t="${cesiumDefaultToken}";` }));
    expect(code).toBe(0);
    expect(output).toContain('Cesium 源码自带的公开默认 ion token');
  });

  it('出现其他 JWT 时失败，只输出指纹与文件，不输出 token 值', () => {
    const { code, output } = runScan(
      makeDist({ 'cesium.js': `var t="${cesiumDefaultToken}";`, 'app.js': `const token = "${fakeJwt}";` }),
    );
    expect(code).toBe(1);
    expect(output).toContain(createHash('sha256').update(fakeJwt).digest('hex').slice(0, 12));
    expect(output).toContain('app.js');
    expect(output).not.toContain(fakeJwt);
    expect(output).not.toContain(cesiumDefaultToken);
  });

  it('EXPECTED_TOKEN 作为废弃别名仍放行 Cesium token，并提示迁移', () => {
    const { code, output } = runScan(makeDist({ 'app.js': `const token = "${fakeJwt}";` }), {
      EXPECTED_TOKEN: fakeJwt,
    });
    expect(code).toBe(0);
    expect(output).toContain('EXPECTED_TOKEN 已废弃');
    expect(output).toContain('cesium-ion-token');
    // 声明值本身不得出现在输出里（CI 公开日志）
    expect(output).not.toContain(fakeJwt);
  });

  it('EXPECTED_TOKEN 设置了但不是合法 JWT 形态时失败（fail-closed）', () => {
    const { code, output } = runScan(makeDist({ 'app.js': 'ok' }), { EXPECTED_TOKEN: 'not-a-jwt' });
    expect(code).toBe(1);
    expect(output).toContain('EXPECTED_TOKEN');
    expect(output).toContain('不是预期形态');
  });

  it('检出 AWS Access Key 形态（非 JWT 第二层检测）', () => {
    const { code, output } = runScan(makeDist({ 'aws.js': `var k = "${fakeAwsKeyId}";` }));
    expect(code).toBe(1);
    expect(output).toContain('AWS Access Key ID');
    expect(output).toContain('aws.js');
  });

  it('检出 PEM 私钥块', () => {
    const { code, output } = runScan(
      makeDist({ 'key.txt': '-----BEGIN RSA PRIVATE KEY-----\nMIIEow...\n-----END RSA PRIVATE KEY-----' }),
    );
    expect(code).toBe(1);
    expect(output).toContain('PEM 私钥块');
  });

  it('产物目录不存在时失败', () => {
    expect(runScan(join(makeDist({}), 'missing')).code).toBe(1);
  });
});

describe('类型化凭据声明（F3：非 JWT 凭据的声明与校验）', { timeout: 30_000 }, () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('构建期 configure 了 CESIUM_ION_TOKEN 但未声明时失败（不再有「注入了却没声明」的盲区）', () => {
    const { code, output } = runScan(makeDist({ 'app.js': `const t="${fakeJwt}";` }), {
      CESIUM_ION_TOKEN: fakeJwt,
    });
    expect(code).toBe(1);
    expect(output).toContain('CESIUM_ION_TOKEN 在构建期已配置但未声明 EXPECTED_CESIUM_TOKEN');
  });

  it('CESIUM_ION_TOKEN 与 EXPECTED_CESIUM_TOKEN 一致时放行', () => {
    const { code, output } = runScan(makeDist({ 'app.js': `const t="${fakeJwt}";` }), {
      CESIUM_ION_TOKEN: fakeJwt,
      EXPECTED_CESIUM_TOKEN: fakeJwt,
    });
    expect(code).toBe(0);
    expect(output).toContain('cesium-ion-token');
    expect(output).toContain(createHash('sha256').update(fakeJwt).digest('hex').slice(0, 12));
    expect(output).not.toContain(fakeJwt);
  });

  it('声明与构建期 define 不一致时失败，且只输出两个指纹', () => {
    const { code, output } = runScan(makeDist({ 'app.js': `const t="${fakeJwt}";` }), {
      CESIUM_ION_TOKEN: fakeJwt,
      EXPECTED_CESIUM_TOKEN: otherJwt,
    });
    expect(code).toBe(1);
    expect(output).toContain('不一致');
    expect(output).toContain(createHash('sha256').update(fakeJwt).digest('hex').slice(0, 12));
    expect(output).toContain(createHash('sha256').update(otherJwt).digest('hex').slice(0, 12));
    expect(output).not.toContain(fakeJwt);
    expect(output).not.toContain(otherJwt);
  });

  it('声明的值在产物里不存在时失败（扫描对象与发布对象错位的盲区）', () => {
    const { code, output } = runScan(makeDist({ 'app.js': 'const ok = 1;' }), {
      EXPECTED_CESIUM_TOKEN: fakeJwt,
    });
    expect(code).toBe(1);
    expect(output).toContain('未在产物中出现');
    expect(output).not.toContain(fakeJwt);
  });

  it('类型化声明形态不合法时失败（截断的值不能算已声明）', () => {
    const { code, output } = runScan(makeDist({ 'app.js': `const t="${fakeJwt}";` }), {
      EXPECTED_CESIUM_TOKEN: 'eyJhbGciOiJIUzI1NiJ9.truncated',
    });
    expect(code).toBe(1);
    expect(output).toContain('EXPECTED_CESIUM_TOKEN 已设置但不是预期形态');
  });

  it('构建期 CESIUM_ION_TOKEN 不是 JWT 形态时失败（无法校验的值不放行）', () => {
    const { code, output } = runScan(makeDist({ 'app.js': 'const ok = 1;' }), {
      CESIUM_ION_TOKEN: 'plain-opaque-token',
      EXPECTED_CESIUM_TOKEN: 'plain-opaque-token',
    });
    expect(code).toBe(1);
    expect(output).toContain('构建期 CESIUM_ION_TOKEN 非空但不是预期形态');
  });

  it('构建期注入未声明的 AMAP_KEY 时失败（不透明凭据同样受门禁约束）', () => {
    const { code, output } = runScan(makeDist({ 'amap.js': `var key="${fakeAmapKey}";` }), {
      AMAP_KEY: fakeAmapKey,
    });
    expect(code).toBe(1);
    expect(output).toContain('AMAP_KEY 在构建期已配置但未声明 EXPECTED_AMAP_KEY');
    expect(output).not.toContain(fakeAmapKey);
  });

  it('AMAP_KEY 与 EXPECTED_AMAP_KEY 一致时放行，只输出指纹与文件', () => {
    const { code, output } = runScan(makeDist({ 'amap.js': `var key="${fakeAmapKey}";` }), {
      AMAP_KEY: fakeAmapKey,
      EXPECTED_AMAP_KEY: fakeAmapKey,
    });
    expect(code).toBe(0);
    expect(output).toContain('amap-key');
    expect(output).toContain(createHash('sha256').update(fakeAmapKey).digest('hex').slice(0, 12));
    expect(output).toContain('amap.js');
    expect(output).not.toContain(fakeAmapKey);
  });

  it('AMAP_KEY 声明成另一个合法 key 时失败（declared value differs from artifact value）', () => {
    const { code, output } = runScan(makeDist({ 'amap.js': `var key="${fakeAmapKey}";` }), {
      AMAP_KEY: fakeAmapKey,
      EXPECTED_AMAP_KEY: otherAmapKey,
    });
    expect(code).toBe(1);
    expect(output).toContain('不一致');
    expect(output).not.toContain(fakeAmapKey);
    expect(output).not.toContain(otherAmapKey);
  });

  it('AMAP_KEY 声明形态不合法（非 32 位十六进制）时失败', () => {
    for (const malformed of ['short', `${fakeAmapKey} `, `"${fakeAmapKey}"`]) {
      const { code, output } = runScan(makeDist({ 'amap.js': `var key="${fakeAmapKey}";` }), {
        AMAP_KEY: fakeAmapKey,
        EXPECTED_AMAP_KEY: malformed,
      });
      expect(code).toBe(1);
      expect(output).toContain('EXPECTED_AMAP_KEY 已设置但不是预期形态');
    }
  });

  it('构建期注入未声明的 AMAP_SECURITY_CODE 时失败，声明一致后放行', () => {
    const dist = { 'amap.js': `var code="${fakeAmapSecurityCode}";` };
    const undeclared = runScan(makeDist(dist), { AMAP_SECURITY_CODE: fakeAmapSecurityCode });
    expect(undeclared.code).toBe(1);
    expect(undeclared.output).toContain('AMAP_SECURITY_CODE 在构建期已配置但未声明 EXPECTED_AMAP_SECURITY_CODE');

    const declared = runScan(makeDist(dist), {
      AMAP_SECURITY_CODE: fakeAmapSecurityCode,
      EXPECTED_AMAP_SECURITY_CODE: fakeAmapSecurityCode,
    });
    expect(declared.code).toBe(0);
    expect(declared.output).toContain('amap-security-code');
    expect(declared.output).not.toContain(fakeAmapSecurityCode);
  });

  it('扫描失败与成功的日志都不含任何凭据明文（公开 CI 日志）', () => {
    const plaintexts = [fakeJwt, otherJwt, fakeAmapKey, otherAmapKey, fakeAmapSecurityCode, cesiumDefaultToken];
    const injected = {
      'app.js': `const a="${fakeJwt}";const b="${fakeAmapKey}";const c="${fakeAmapSecurityCode}";`,
      'cesium.js': `var t="${cesiumDefaultToken}";`,
    };
    const runs = [
      runScan(makeDist(injected), {
        CESIUM_ION_TOKEN: fakeJwt,
        AMAP_KEY: fakeAmapKey,
        AMAP_SECURITY_CODE: fakeAmapSecurityCode,
      }),
      runScan(makeDist(injected), {
        CESIUM_ION_TOKEN: fakeJwt,
        AMAP_KEY: fakeAmapKey,
        AMAP_SECURITY_CODE: fakeAmapSecurityCode,
        EXPECTED_CESIUM_TOKEN: fakeJwt,
        EXPECTED_AMAP_KEY: fakeAmapKey,
        EXPECTED_AMAP_SECURITY_CODE: fakeAmapSecurityCode,
      }),
      runScan(makeDist(injected), { CESIUM_ION_TOKEN: fakeJwt, EXPECTED_CESIUM_TOKEN: otherJwt }),
    ];
    expect(runs.map((run) => run.code)).toEqual([1, 0, 1]);
    for (const { output } of runs) {
      for (const plaintext of plaintexts) expect(output).not.toContain(plaintext);
    }
  });
});

describe('define 块与凭据登记表漂移（fail-closed）', () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('真实 config/config.ts 的 env 派生 define 恰好是登记的三类凭据 + 显式登记的公开配置', async () => {
    const scanner = await loadScanner();
    const source = readFileSync(new URL('../config/config.ts', import.meta.url), 'utf8');
    const readModule = (specifier: string) => {
      for (const suffix of ['.ts', '.mjs', '.js']) {
        try {
          return readFileSync(new URL(`../config/${specifier}${suffix}`, import.meta.url), 'utf8');
        } catch {
          // 换下一个扩展名
        }
      }
      return undefined;
    };
    // 间接绑定也算：AUTH_CONFIG = resolveAuthConfig(process.env)、BUILD_INFO 来自读取 process.env 的 ./buildInfo
    expect(scanner.findEnvBackedDefines(source, { readModule }).sort()).toEqual(
      [
        ...scanner.CREDENTIAL_DECLARATIONS.map((entry) => entry.define),
        ...Object.keys(scanner.PUBLIC_ENV_DEFINES),
      ].sort(),
    );
    const { failures } = scanner.evaluateDeclarations({
      env: {},
      envBackedDefines: scanner.findEnvBackedDefines(source, { readModule }),
    });
    expect(failures).toEqual([]);
  });

  it('间接绑定（先赋给变量 / 解构 / 函数 / 本地模块）同样识别为 env 派生 define', async () => {
    const scanner = await loadScanner();
    const fixture = [
      'export const BEFORE_IMPORTS = { a: 1 };',
      "import { LEAKED_FROM_MODULE } from './secrets';",
      "import { innocent } from './plain';",
      'const DIRECT = process.env.SECRET_ONE;',
      'const DERIVED = `${DIRECT}-suffix`;',
      'const { SECRET_TWO, nested: RENAMED } = process.env;',
      'function readSecret() {',
      "  return process['env'].SECRET_THREE;",
      '}',
      "const PLAIN = 'public-value';",
      'export default defineConfig({',
      '  define: {',
      '    DIRECT,',
      '    VIA_DERIVED: DERIVED,',
      '    SECRET_TWO,',
      '    VIA_RENAMED: RENAMED,',
      '    VIA_FUNCTION: readSecret(),',
      '    VIA_MODULE: LEAKED_FROM_MODULE,',
      '    PLAIN,',
      '    INNOCENT: innocent,',
      '  },',
      '});',
    ].join('\n');
    const modules: Record<string, string> = {
      './secrets': "export { TOKEN as LEAKED_FROM_MODULE } from './deeper';",
      './deeper': 'export const TOKEN = process.env.DEEP_SECRET;',
      './plain': "export const innocent = 'nothing to see';",
    };
    const readModule = (specifier: string) => modules[specifier];
    expect(scanner.findEnvBackedDefines(fixture, { readModule }).sort()).toEqual(
      ['DIRECT', 'SECRET_TWO', 'VIA_DERIVED', 'VIA_FUNCTION', 'VIA_MODULE', 'VIA_RENAMED'].sort(),
    );
  });

  it('define 块里认不出的条目（展开 / 计算属性名）判失败，不当成「没有凭据」', async () => {
    const scanner = await loadScanner();
    const fixture = [
      'const EXTRA = { X: process.env.X };',
      "const KEY = 'DYNAMIC';",
      'export default defineConfig({',
      '  define: {',
      '    ...EXTRA,',
      '    [KEY]: 1,',
      "    'QUOTED_SECRET': process.env.QUOTED,",
      '  },',
      '});',
    ].join('\n');
    const envBacked = scanner.findEnvBackedDefines(fixture);
    expect(envBacked).toContain('QUOTED_SECRET');
    const registered = scanner.CREDENTIAL_DECLARATIONS.map((entry) => entry.define);
    const { failures } = scanner.evaluateDeclarations({ env: {}, envBackedDefines: [...registered, ...envBacked] });
    expect(failures.some((message) => message.includes('...EXTRA'))).toBe(true);
    expect(failures.some((message) => message.includes('[KEY]'))).toBe(true);
    expect(failures.some((message) => message.includes('QUOTED_SECRET'))).toBe(true);
  });

  it('define 块解析能跳过注释与字符串里的花括号/冒号', async () => {
    const scanner = await loadScanner();
    const fixture = [
      'export default defineConfig({',
      '  // define: { NOT_A_REAL_BLOCK: process.env.EVIL }',
      '  define: {',
      "    CESIUM_BASE_URL: '/Cesium',",
      '    /* 块注释：{ process.env.NOT_ME } */',
      "    PUBLIC_PATH: '/',",
      '    CESIUM_ION_TOKEN: process.env.CESIUM_ION_TOKEN || "",',
      '    BUILD_INFO,',
      "    NOTE: 'not a define: process.env.NOPE',",
      '  },',
      '});',
    ].join('\n');
    expect(scanner.findEnvBackedDefines(fixture)).toEqual(['CESIUM_ION_TOKEN']);
    const entries = scanner.parseDefineEntries(fixture);
    expect(entries.map((entry) => entry.name)).toEqual([
      'CESIUM_BASE_URL',
      'PUBLIC_PATH',
      'CESIUM_ION_TOKEN',
      'BUILD_INFO',
      'NOTE',
    ]);
    expect(entries.find((entry) => entry.name === 'NOTE')?.referencesEnv).toBe(false);
  });

  it('config 里出现未登记的 process.env define 时判失败', async () => {
    const scanner = await loadScanner();
    const registered = scanner.CREDENTIAL_DECLARATIONS.map((entry) => entry.define);
    const { failures } = scanner.evaluateDeclarations({
      env: {},
      envBackedDefines: [...registered, 'NEW_OPAQUE_CREDENTIAL'],
    });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toContain('NEW_OPAQUE_CREDENTIAL');
    expect(failures[0]).toContain('没有它');
  });

  it('登记表里的凭据在 define 块里缺失时判失败', async () => {
    const scanner = await loadScanner();
    const { failures } = scanner.evaluateDeclarations({ env: {}, envBackedDefines: [] });
    expect(failures).toHaveLength(scanner.CREDENTIAL_DECLARATIONS.length);
    for (const entry of scanner.CREDENTIAL_DECLARATIONS) {
      expect(failures.some((message) => message.includes(entry.define))).toBe(true);
    }
  });

  it('同一凭据同时用 EXPECTED_TOKEN 与新名声明且不一致时判失败', async () => {
    const scanner = await loadScanner();
    const registered = scanner.CREDENTIAL_DECLARATIONS.map((entry) => entry.define);
    const { failures, warnings } = scanner.evaluateDeclarations({
      env: {
        CESIUM_ION_TOKEN: fakeJwt,
        EXPECTED_CESIUM_TOKEN: fakeJwt,
        EXPECTED_TOKEN: otherJwt,
      },
      envBackedDefines: registered,
    });
    expect(warnings.some((message) => message.includes('EXPECTED_TOKEN 已废弃'))).toBe(true);
    expect(failures.some((message) => message.includes('无法判定以哪个声明为准'))).toBe(true);
  });
});

describe('umi 隐式注入的 UMI_APP_* 通道', { timeout: 30_000 }, () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('未登记的 UMI_APP_* 出现在构建环境里时失败，只报变量名不报值', () => {
    const value = `${fakeAmapKey}-leak`;
    const { code, output } = runScan(makeDist({ 'app.js': 'ok' }), { UMI_APP_PAYMENT_SECRET: value });
    expect(code).toBe(1);
    expect(output).toContain('UMI_APP_PAYMENT_SECRET');
    expect(output).not.toContain(value);
  });

  it('cwd 下 .env / .env.local 里的 UMI_APP_*（umi loadEnv 会读）同样受约束', () => {
    for (const file of ['.env', '.env.local']) {
      const cwd = makeDist({});
      writeFileSync(join(cwd, file), `# comment\nexport UMI_APP_HIDDEN_KEY=${fakeAmapKey}\nOTHER=1\n`);
      const { code, output } = runScan(makeDist({ 'app.js': 'ok' }), {}, cwd);
      expect({ file, code }).toEqual({ file, code: 1 });
      expect(output).toContain('UMI_APP_HIDDEN_KEY');
      expect(output).not.toContain(fakeAmapKey);
    }
  });

  it('登记过的公开 UMI_APP_*（API 前缀 / 演示开关）放行', () => {
    const { code } = runScan(makeDist({ 'app.js': 'ok' }), { UMI_APP_API_BASE: '/api', UMI_APP_DEMO_MODE: 'true' });
    expect(code).toBe(0);
  });

  it('findImplicitEnvChannel 合并环境变量与 env 文件里的变量名，忽略已登记的公开项', async () => {
    const scanner = await loadScanner();
    expect(
      scanner
        .findImplicitEnvChannel({
          env: { UMI_APP_API_BASE: '/api', UMI_APP_A: 'x', PATH: '/bin' },
          envFileNames: ['UMI_APP_B', 'UMI_APP_DEMO_MODE', 'NOT_UMI'],
        })
        .sort(),
    ).toEqual(['UMI_APP_A', 'UMI_APP_B']);
  });
});

describe('用例与开发者 shell 环境隔离', { timeout: 30_000 }, () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('父进程导出了 CESIUM_ION_TOKEN / AMAP_KEY / UMI_APP_* 时，用例结论不变', () => {
    const saved = { ...process.env };
    try {
      process.env.CESIUM_ION_TOKEN = fakeJwt;
      process.env.AMAP_KEY = fakeAmapKey;
      process.env.EXPECTED_CESIUM_TOKEN = otherJwt;
      process.env.UMI_APP_SHELL_ONLY = 'x';
      const { code, output } = runScan(makeDist({ 'cesium.js': `var t="${cesiumDefaultToken}";` }));
      expect({ code, output }).toMatchObject({ code: 0 });
    } finally {
      for (const name of Object.keys(process.env)) if (!(name in saved)) delete process.env[name];
      Object.assign(process.env, saved);
    }
  });

  it('隔离名单覆盖登记表里的全部凭据与声明变量名', async () => {
    const scanner = await loadScanner();
    const names = scanner.CREDENTIAL_DECLARATIONS.flatMap((entry) =>
      [entry.define, entry.declaration, entry.alias].filter((name): name is string => !!name),
    );
    expect(names.filter((name) => !SCANNER_ENV_RE.test(name))).toEqual([]);
  });
});

describe('发布产线的扫描接入（F4：Docker 与 Vercel）', { timeout: 30_000 }, () => {
  /** 合并续行后的 Dockerfile 指令列表（`RUN a \` + `b` 算一条指令） */
  const dockerfileInstructions = (source: string) => {
    const instructions: string[] = [];
    let current = '';
    for (const line of source.split('\n')) {
      current = current ? `${current}\n${line}` : line;
      if (current.trimEnd().endsWith('\\')) continue;
      if (current.trim()) instructions.push(current.trim());
      current = '';
    }
    return instructions;
  };

  const readRepoFile = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

  it('Dockerfile 在同一 RUN 内先构建再扫描，扫描先于 COPY dist 进运行镜像', () => {
    const instructions = dockerfileInstructions(readRepoFile('Dockerfile'));
    const scanRun =
      instructions.find(
        (instruction) => instruction.startsWith('RUN') && instruction.includes('check-dist-secrets.mjs'),
      ) ?? '';
    expect(scanRun).not.toBe('');
    // 扫描与构建同层：扫描失败则该层不落盘，不存在「未扫描的 dist 层」
    expect(scanRun).toContain('pnpm build');
    expect(
      instructions.filter((instruction) => instruction.startsWith('RUN') && instruction.includes('pnpm build')),
    ).toHaveLength(1);
    const copyIndex = instructions.findIndex((instruction) => instruction.startsWith('COPY --from=builder /app/dist'));
    expect(copyIndex).toBeGreaterThan(instructions.indexOf(scanRun));
    // RUN 文本用 sh 解析：Dockerfile 里的 shell 语法错误能在单元测试里先暴露（本机/CI 不跑 docker build）
    const parsed = spawnSync('sh', ['-n'], { input: scanRun.replace(/^RUN\s+/, ''), encoding: 'utf8' });
    expect(parsed.stderr).toBe('');
    expect(parsed.status).toBe(0);
  });

  it('Dockerfile 凭据只经 ARG（绝不 ENV），三类凭据都映射成扫描器的 EXPECTED_* 声明', () => {
    const source = readRepoFile('Dockerfile');
    expect(source).not.toMatch(/^ENV\b.*(?:CESIUM|AMAP)/m);
    const mappings = [
      ['CESIUM_ION_TOKEN', 'EXPECTED_CESIUM_TOKEN'],
      ['AMAP_KEY', 'EXPECTED_AMAP_KEY'],
      ['AMAP_SECURITY_CODE', 'EXPECTED_AMAP_SECURITY_CODE'],
    ] as const;
    for (const [define, declaration] of mappings) {
      expect(source).toMatch(new RegExp(`^ARG ${define}=`, 'm'));
      expect(source).toContain(`${declaration}="$${define}"`);
    }
  });

  it('vercel.json 的 buildCommand 先构建、再扫描 dist（Vercel 在 buildCommand 之后才发布）', () => {
    const vercel = JSON.parse(readRepoFile('vercel.json')) as { buildCommand: string; outputDirectory: string };
    expect(vercel.outputDirectory).toBe('dist');
    const commands = vercel.buildCommand.split('&&').map((command) => command.trim());
    expect(commands).toHaveLength(2);
    expect(commands[0]).toContain('build');
    expect(commands[1]).toBe('node scripts/check-dist-secrets.mjs dist');
  });
});
