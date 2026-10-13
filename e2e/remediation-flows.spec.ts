import { expect, navigate, signIn, test } from './fixtures';

/**
 * F03 / F06 的浏览器回归：
 * - 历史工单深链接在整页刷新后仍能按 ID 加载并打开详情；
 * - 已验收工单返工：旧验收归档为失效、回到处理中、重新完成后可再次验收。
 */
test('F03 历史工单深链接：整页刷新后按 ID 打开', async ({ page }) => {
  await signIn(page);
  await page.goto('ops/tickets?focus=WO-SCN-HIST');
  const drawer = page.locator('.ant-drawer-section');
  await expect(drawer).toBeVisible({ timeout: 15_000 });
  await expect(drawer).toContainText('WO-SCN-HIST');
  // 完成超过三天：看板「近三天」提示之外仍可定位
  await expect(drawer).toContainText('已完成');
  await expect(page).toHaveURL(/focus=WO-SCN-HIST/);
});

test('F03 不存在的工单深链接给出可理解反馈', async ({ page }) => {
  await signIn(page);
  await page.goto('ops/tickets?focus=WO-00000000-000');
  await expect(page.locator('.ant-message-notice').getByText('未找到工单').first()).toBeVisible({ timeout: 15_000 });
});

test('F06 已验收工单返工：归档旧验收 → 再完成 → 再验收', async ({ page }) => {
  await signIn(page);
  await navigate(page, '/ops/tickets?focus=WO-SCN-REWORK');
  const drawer = page.locator('.ant-drawer-section');
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('已验收');
  // 合成签名可见（历史样本）
  await expect(drawer.locator('img[src^="data:image/png"]').first()).toBeVisible();
  // 返工：确认后旧验收归档
  // antd 按钮文案会在两个汉字间自动插入空格（返 工）
  await drawer.getByRole('button', { name: /返\s*工/ }).click();
  await page.locator('.ant-modal-confirm .ant-btn-primary, .ant-modal .ant-btn-primary').click();
  await expect(drawer).toContainText('处理中');
  await expect(drawer).toContainText('历史验收（已失效）');
  // 重新完成后，签名页里这张工单重新出现在待验收
  await drawer.locator('.ant-segmented-item', { hasText: '已完成' }).click();
  await page.keyboard.press('Escape');
  await navigate(page, '/components/signature');
  await page.getByRole('combobox').first().click();
  await page.locator('.ant-select-item-option', { hasText: 'WO-SCN-REWORK' }).click();
  // getByText 会先命中 select 的 aria-live 隐藏区，断言可见的选中项
  await expect(page.locator('.ant-select', { hasText: 'WO-SCN-REWORK' }).first()).toBeVisible();
});
