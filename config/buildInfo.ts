import { execFileSync } from 'child_process';

/**
 * 构建信息：提交、时间、部署目标。页面页脚显示，并输出 dist/version.json 供部署后核对
 * （三条产线曾各自停在不同版本而无人察觉）。
 */
const gitSha = () => {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};

const target = () => {
  if (process.env.UMI_ENV === 'github') return 'github-pages';
  if (process.env.VERCEL) return 'vercel';
  if (process.env.CF_PAGES) return 'cloudflare-pages';
  return process.env.BUILD_TARGET || 'local';
};

export const BUILD_INFO = {
  sha: process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA || gitSha(),
  time: new Date().toISOString(),
  target: target(),
};

type VersionFileOptions = { demoMode?: boolean };

type CompilerLike = {
  hooks: {
    thisCompilation: {
      tap(name: string, fn: (compilation: CompilationLike) => void): void;
    };
  };
  webpack: { sources: { RawSource: new (source: string) => unknown } };
};
type CompilationLike = {
  hooks: { processAssets: { tap(options: { name: string; stage: number }, fn: () => void): void } };
  emitAsset(name: string, source: unknown): void;
};
type WebpackChainConfig = {
  plugin: (name: string) => {
    // args 须写成构造参数元组：webpack-5-chain 的 use<P>(plugin, args?: ConstructorParameters<P>)，
    // 写成 unknown[] 会让 umi 的 Config 无法赋值给本接口（参数逆变）。
    use: (
      plugin: new (options?: VersionFileOptions) => { apply(compiler: CompilerLike): void },
      args?: [options?: VersionFileOptions],
    ) => unknown;
  };
};

class VersionFilePlugin {
  constructor(private readonly options: VersionFileOptions = {}) {}

  apply(compiler: CompilerLike) {
    compiler.hooks.thisCompilation.tap('VersionFilePlugin', (compilation) => {
      // stage 数值取 webpack PROCESS_ASSETS_STAGE_ADDITIONAL（-2000）：只新增文件
      compilation.hooks.processAssets.tap({ name: 'VersionFilePlugin', stage: -2000 }, () => {
        /**
         * demoMode 与产物同源落盘：产物属于哪条产线必须能从产物自身读出来。
         * scripts/real-mode-artifact.test.ts 据此决定断言方向（真实模式：不得含演示数据 +
         * 必须含替身哨兵）；此前用 node_modules/.cache 的旁路文件记录模式，缓存文件可能比
         * dist 更新（复审 2026-10-14 实测出现过缓存 18:41 / 产物 18:31），断言就会对着错误的
         * 产物执行。version.json 本身在 dist 内，随构建一起生成，也自动被完整性清单与密钥
         * 扫描覆盖。默认值取构建环境变量，config.github.ts 直接复用本插件（它只允许演示构建）。
         */
        const demoMode = this.options.demoMode ?? process.env.UMI_APP_DEMO_MODE === 'true';
        compilation.emitAsset(
          'version.json',
          new compiler.webpack.sources.RawSource(`${JSON.stringify({ ...BUILD_INFO, demoMode }, null, 2)}\n`),
        );
      });
    });
  }
}

export const addVersionFile = (config: WebpackChainConfig, options: VersionFileOptions = {}) => {
  config.plugin('version-file').use(VersionFilePlugin, [options]);
};
