/**
 * pdf.js worker 的入口模块源码：先 import polyfill（worker 是独立的全局作用域，主线程装的不算数），
 * 再执行 pdf.js 自带的 worker。ES module 按书写顺序求值依赖，polyfill 一定先于 pdf.js。
 * `export *` 保持与 pdf.worker.mjs 相同的导出形状。worker 起不来时 pdf.js 会退回主线程「fake worker」
 * 并 import(workerSrc)：生产 CSP 的 script-src 不含 blob:，这条退路会被拦下、按加载失败处理——
 * 对本页这是想要的结果：主线程解析不可信 PDF 时，10 秒超时无法打断。
 */
export const pdfWorkerModuleSource = (polyfillUrl: string, workerUrl: string) =>
  `import ${JSON.stringify(polyfillUrl)};\nexport * from ${JSON.stringify(workerUrl)};\n`;

/**
 * 作为 `GlobalWorkerOptions.workerSrc` 的同源 blob URL。
 *
 * 用 workerSrc 而不是自建 Worker 传 workerPort：pdf.js 仍为每份文档创建 worker，并在文档销毁时
 * terminate（workerPort 会让所有文档共用一个永不终止的 worker）。pdf.js 自己对 CDN 上的 worker
 * 也是这样包一层 blob 模块（PDFWorker._createCDNWrapper）；CSP 的 worker-src 已放行 blob:，
 * worker 内 import 的两个文件都是同源产物，受 script-src 'self' 约束。
 */
export const createPdfWorkerSrc = () => {
  const source = pdfWorkerModuleSource(
    new URL('./pdfjsPolyfills.mjs', import.meta.url).href,
    new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href,
  );
  return URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
};
