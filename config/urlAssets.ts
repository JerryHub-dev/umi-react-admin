type WebpackChainConfig = {
  module: { rule: (name: string) => { set: (key: string, value: unknown) => unknown } };
};

/**
 * 经 `new URL('./x.mjs', import.meta.url)` 原样产出、在打包环境之外按 URL 加载的脚本不走 src 的 babel。
 *
 * 目前只有 src/pages/Document/Pdf/pdfjsPolyfills.mjs：pdf.js 的 worker 是独立的全局作用域，先按 URL
 * import 这份 polyfill 再加载 pdf.js。umi 的 src 规则（/\.(js|mjs|cjs)$/）不区分依赖类型，babel 的
 * transform-runtime 会给它注入指向 @babel/runtime 的 import（还是构建机上的绝对路径），worker 里无法解析。
 * 同一文件被普通 import（依赖类型 esm）时照常转译。dev 与生产都需要，不放进 production 分支。
 */
export const keepUrlAssetsVerbatim = (config: WebpackChainConfig) => {
  config.module.rule('src').set('dependency', { not: /^url$/ });
};
