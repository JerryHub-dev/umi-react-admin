import { expect, navigate, signIn, test } from './fixtures';

test('Excel 大文件拒绝后仍可导出模板并通过实际 worker 回导', async ({ page, health }) => {
  await signIn(page);
  await navigate(page, '/document/excel');
  const input = page.locator('input[type=file]');
  await input.setInputFiles({
    name: 'oversized.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(page.locator('.ant-message')).toContainText('5 MiB');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: /下载导入模板/ }).click();
  const path = await (await downloading).path();
  expect(path).toBeTruthy();
  await input.setInputFiles(path!);
  await expect(page.locator('.ant-table-row')).toHaveCount(2);
  await expect(page.getByText('sample.a@example.com')).toBeVisible();
  await expect(page.getByText('sample.b@example.com')).toBeVisible();
  await expect(page.getByRole('button', { name: /导入.*2/ })).toBeEnabled();
  expect(health.pageErrors).toEqual([]);
  expect(health.consoleErrors).toEqual([]);
  expect(await health.csp()).toEqual([]);
});

test('Excel 一键载入示例：不下载文件，直接进入同一条逐行校验预览', async ({ page, health }) => {
  await signIn(page);
  await navigate(page, '/document/excel');
  await page.getByRole('button', { name: '部分有效' }).click();
  await expect(page.locator('.ant-alert')).toContainText('共 4 行：2 行有效，2 行有误');
  await expect(page.locator('.ant-table-row')).toHaveCount(4);
  await page.getByRole('button', { name: /重新选择文件/ }).click();
  await page.getByRole('button', { name: '全有效' }).click();
  await expect(page.locator('.ant-alert')).toContainText('共 3 行：3 行有效，0 行有误');
  await expect(page.getByRole('button', { name: /导入 3 条有效数据/ })).toBeEnabled();
  expect(health.pageErrors).toEqual([]);
  expect(health.consoleErrors).toEqual([]);
  expect(await health.csp()).toEqual([]);
});

test('PDF 拒绝过大文件，并可恢复及重新打开正常生成的两页报告', async ({ page, health }) => {
  await signIn(page);
  await navigate(page, '/document/pdf');
  await expect(page.getByRole('button', { name: '下载 PDF' })).toBeEnabled({ timeout: 45_000 });
  await expect(page.locator('.react-pdf__Page__canvas')).toHaveCount(2);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 PDF' }).click();
  const path = await (await downloading).path();
  expect(path).toBeTruthy();
  const input = page.locator('input[type=file]');
  await input.setInputFiles({
    name: 'oversized.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(20 * 1024 * 1024 + 1),
  });
  await expect(page.getByText('PDF 文件不得超过 20 MiB')).toBeVisible();
  await input.setInputFiles(path!);
  await expect(page.locator('.react-pdf__Page__canvas')).toHaveCount(2);
  await expect(page.getByText('PDF 文件不得超过 20 MiB')).toHaveCount(0);
  expect(health.pageErrors).toEqual([]);
  expect(health.consoleErrors).toEqual([]);
  expect(await health.csp()).toEqual([]);
});

/**
 * pdf.js 6 调用的 ES2026 内建方法（Map/WeakMap 的 getOrInsert*、Math.sumPrecise）要到 Chrome 145/147、
 * Firefox 144、Safari 26.2 才原生提供（见 src/pages/Document/Pdf/pdfjsPolyfills.mjs）。CI 里 Playwright 自带的
 * Chromium 已经原生支持，直接跑测不出缺失，所以先删掉它们模拟较旧的浏览器：主线程用 init script；
 * worker 是独立的全局作用域、不执行 init script，只能在它加载的 polyfill 产物前面插入同样的删除语句。
 */
const REMOVE_ES2026_METHODS =
  'for (const C of [Map, WeakMap]) { delete C.prototype.getOrInsert; delete C.prototype.getOrInsertComputed; }\n' +
  'delete Math.sumPrecise;\n';

test('PDF 在缺少 ES2026 内建方法的浏览器上仍能渲染报告与内嵌字体的文档', async ({ page, health }) => {
  await page.addInitScript(REMOVE_ES2026_METHODS);
  let workerPolyfills = 0;
  await page.route(/\/pdfjsPolyfills\.[0-9a-f]+\.mjs$/, async (route) => {
    workerPolyfills += 1;
    const response = await route.fetch();
    await route.fulfill({ response, body: REMOVE_ES2026_METHODS + (await response.text()) });
  });
  // Chromium 打印出的文本 PDF 内嵌 TrueType 子集字体：pdf.js 在 worker 里修复字体、重建 name 表时调用 Math.sumPrecise
  const printer = await page.context().newPage();
  await printer.setContent('<p style="font: 48px serif">Serif</p><p style="font: 48px sans-serif">Sans</p>');
  const fontPdf = await printer.pdf({ format: 'A4' });
  await printer.close();

  await signIn(page);
  await navigate(page, '/document/pdf');
  await expect(page.getByRole('button', { name: '下载 PDF' })).toBeEnabled({ timeout: 45_000 });
  await expect(page.locator('.react-pdf__Page__canvas')).toHaveCount(2);
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'fonts.pdf', mimeType: 'application/pdf', buffer: fontPdf });
  await expect(page.locator('.react-pdf__Page__canvas')).toHaveCount(1);
  // 字体转换抛错时 pdf.js 不报错，而是静默退回系统字体（页面照样画出文字）：以内嵌字体转换成功、
  // 注册为 FontFace（名为 g_d<文档>_f<序号>）为准。worker 缺 Math.sumPrecise 时一个都不会注册
  await expect
    .poll(() => page.evaluate(() => [...document.fonts].filter((face) => /g_d\d+_f\d+/.test(face.family)).length))
    .toBeGreaterThan(0);
  await expect(page.getByText('文档加载失败，请选择本地文件重试')).toHaveCount(0);
  expect(workerPolyfills).toBeGreaterThan(0);
  expect(health.pageErrors).toEqual([]);
  expect(health.consoleErrors).toEqual([]);
  expect(await health.csp()).toEqual([]);
});
