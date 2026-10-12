import { BASE_URL, expect, test } from './fixtures';

for (const target of ['/\\external.example.invalid/path', '/system/../../login', '/%2e%2e/login', '/LOGIN']) {
  test(`登录回跳拒绝危险表示并留在当前部署路径：${target}`, async ({ page, health }) => {
    await page.goto(`login?redirect=${encodeURIComponent(target)}`);
    await page.evaluate(() => localStorage.setItem('umi-react-admin:tour-seen', '1'));
    await page.getByRole('button', { name: /以管理员体验|Try as administrator/ }).click();
    await expect(page).toHaveURL(new URL('dashboard', BASE_URL).href);
    expect(health.pageErrors).toEqual([]);
    expect(await health.csp()).toEqual([]);
  });
}
