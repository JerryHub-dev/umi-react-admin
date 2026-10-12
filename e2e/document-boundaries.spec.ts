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
