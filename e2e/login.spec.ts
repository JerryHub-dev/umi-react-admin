import { expect, navigate, signIn, test } from './fixtures';

/** 打开登录页（清空会话与偏好），可选界面语言 */
const openLogin = async (page: import('@playwright/test').Page, locale = 'zh-CN') => {
  await page.context().clearCookies();
  await page.goto('login');
  await page.evaluate((l) => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('umi_locale', l);
    localStorage.setItem('umi-react-admin:tour-seen', '1');
  }, locale);
  await page.reload();
  await expect(page.locator('input#name')).toBeVisible();
};

/** 画布当前像素的指纹：同一帧两次取值相同，动画中的两帧不同 */
const canvasPrint = (page: import('@playwright/test').Page) =>
  page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL());

test('标签页标题随页面与语言变化 @smoke', async ({ page }) => {
  await openLogin(page);
  await expect(page).toHaveTitle('登录 - React Admin');
  await signIn(page);
  await expect(page).toHaveTitle('工作台 - React Admin');
  await navigate(page, '/system/users');
  await expect(page).toHaveTitle('用户管理 - React Admin');
});

test('英文登录页没有遗漏的中文，控制台无报错', async ({ page, health }) => {
  await openLogin(page, 'en-US');
  await expect(page).toHaveTitle('Sign in - React Admin');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  // 语言菜单未展开时不渲染「简体中文」，页面上不该再有任何中文
  expect(await page.locator('body').innerText()).not.toMatch(/[一-龥]/);
  expect(health.pageErrors).toEqual([]);
  expect(health.consoleErrors).toEqual([]);
  expect(await health.csp()).toEqual([]);
});

test('会话失效：回到登录页并常驻提示原因，重新登录后回到原页面', async ({ page }) => {
  await signIn(page);
  await navigate(page, '/system/users');
  await expect(page.locator('.ant-table-row').first()).toBeVisible();
  // 模拟会话失效：丢掉当前标签页的演示会话，再发起一次请求
  await page.evaluate(() => sessionStorage.removeItem('umi-react-admin-token'));
  await page.getByRole('button', { name: /查\s*询/ }).click();
  await page.waitForURL(/\/login\?redirect=%2Fsystem%2Fusers&reason=expired$/);
  await expect(page.locator('.ant-alert-warning')).toContainText('登录已过期');
  await expect(page.getByText('登录后将回到「用户管理」')).toBeVisible();
  await page.getByRole('button', { name: /以管理员体验/ }).click();
  await expect(page).toHaveURL(/\/system\/users$/);
  await expect(page.locator('.ant-table-row').first()).toBeVisible();
});

test('减少动态效果：背景只画一帧静态画面', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  await openLogin(page);
  await page.waitForTimeout(400);
  const first = await canvasPrint(page);
  await page.mouse.move(300, 300);
  await page.mouse.move(700, 500, { steps: 8 });
  await page.waitForTimeout(600);
  expect(await canvasPrint(page)).toBe(first);
  // 不是一张空画布
  const blank = await page
    .locator('canvas')
    .evaluate((canvas: HTMLCanvasElement) =>
      Object.assign(document.createElement('canvas'), { width: canvas.width, height: canvas.height }).toDataURL(),
    );
  expect(first).not.toBe(blank);
  await context.close();
});

test('正常动效：背景持续变化并跟随指针', async ({ page }) => {
  await openLogin(page);
  await page.waitForTimeout(400);
  const first = await canvasPrint(page);
  await page.mouse.move(400, 400, { steps: 8 });
  await page.waitForTimeout(400);
  expect(await canvasPrint(page)).not.toBe(first);
});

test('演示模式不出现「记住账号 / 忘记密码」，并提供源码入口', async ({ page }) => {
  await openLogin(page);
  await expect(page.getByRole('link', { name: '在 GitHub 查看源码' })).toHaveAttribute('href', /github\.com/);
  await expect(page.getByText('记住账号')).toHaveCount(0);
  await expect(page.getByText('忘记密码')).toHaveCount(0);
});
