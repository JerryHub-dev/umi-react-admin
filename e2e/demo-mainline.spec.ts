import { expect, navigate, signIn, test } from './fixtures';

/**
 * E01–E10 主线演示回归（正式构建，完整走真实 UI；场景进入/重置经头像菜单完成，不直接改存储）。
 * 一轮是「一条连续的用户旅程」：E04 转的单、E05 签的字、E08 导入的用户要被后续步骤看到，
 * 因此整轮放在同一个测试（同一浏览器上下文）里顺序执行。
 * 连续跑两轮：每轮以「进入固定演示场景」开始、以「重置演示数据」结束，证明重置后可完整复演。
 * 语义对象来自固定场景（src/demo/scenarios.ts）：DEV-SCN-01 / ALM-SCN-MAIN / WO-SCN-REWORK 等。
 */

// 两轮串行：轮 2 语义上依赖轮 1 结束时的「重置演示数据」，且并跑会在整机满载时互相拖慢超时
test.describe.configure({ mode: 'serial' });

const MAIN_DEVICE = 'DEV-SCN-01';
const MAIN_ALARM = 'ALM-SCN-MAIN';
const MAIN_TICKET = 'WO-SCN-MAIN';

/** 头像菜单操作（进入场景 / 重置 / 退出登录都从这里进）；并发负载下下拉偶发没展开，重试 */
const avatarMenu = async (page: import('@playwright/test').Page, item: RegExp | string) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.locator('button[data-tour="account"]').click();
    const menuItem = page.getByRole('menuitem', { name: item });
    try {
      await menuItem.click({ timeout: 5000 });
      return;
    } catch {
      // 下拉没展开（点击被加载态吞掉）：等一拍重开
      await page.waitForTimeout(800);
    }
  }
  await page.getByRole('menuitem', { name: item }).click();
};

const confirmModal = (page: import('@playwright/test').Page) =>
  page.locator('.ant-modal .ant-btn-primary, .ant-modal-confirm .ant-btn-primary').click();

/** 工作台「在线设备」KPI 的当前数值 */
const onlineKpi = async (page: import('@playwright/test').Page) => {
  const card = page.locator('.ant-card', { hasText: '在线设备' }).first();
  await expect(card).toBeVisible();
  const text = await card.locator('.text-3xl').first().innerText();
  return Number(text.match(/[\d,]+/)![0].replace(/,/g, ''));
};

/** 告警页「只看未恢复」当前总数（等表格重载完成、总数稳定后再读，避免读到上一次的总数） */
const unrecoveredTotal = async (page: import('@playwright/test').Page) => {
  await navigate(page, '/ops/alarms');
  await expect(page.locator('.ant-table-row').first()).toBeVisible({ timeout: 20_000 });
  const sw = page.locator('.ant-switch').first();
  if (!(await sw.getAttribute('class'))?.includes('ant-switch-checked')) await sw.click();
  await page.getByRole('button', { name: /查\s*询/ }).click();
  const totalText = page.locator('.ant-pagination-total-text');
  // 「第 1-20 条/总共 27 条」——取「总共」后的总数，不能取第一个数字（那是当前页起始行号）
  const grandTotal = (text: string) => Number(text.match(/总共\s*([\d,]+)/)![1].replace(/,/g, ''));
  let previous = '';
  for (let i = 0; i < 20; i += 1) {
    await page.waitForTimeout(400);
    const current = await totalText.innerText();
    if (current === previous && /总共/.test(current)) return grandTotal(current);
    previous = current;
  }
  return grandTotal(previous);
};

/** 在签名画板上画一笔（鼠标轨迹；触屏长按与键盘回车另有等价入口，见签名页说明） */
const drawSignature = async (page: import('@playwright/test').Page) => {
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  expect(box).toBeTruthy();
  const { x, y, width, height } = box!;
  await page.mouse.move(x + width * 0.2, y + height * 0.35);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) {
    await page.mouse.move(x + width * (0.2 + 0.06 * i), y + height * (0.35 + 0.25 * Math.sin(i / 2)), { steps: 2 });
  }
  await page.mouse.up();
};

for (const round of [1, 2]) {
  test(`主线演示 E01–E10（第 ${round} 轮，连续旅程）`, async ({ page, health }) => {
    test.setTimeout(480_000);

    // ---------- E01 管理员进入固定演示场景 ----------
    await signIn(page);
    // 第二轮开始时可能仍在受控场景（上一轮 E10 的重置保留冻结）：先退出再进入，保证从初始态开始
    await page.locator('button[data-tour="account"]').click();
    const exitItem = page.getByRole('menuitem', { name: '退出受控场景' });
    if (await exitItem.count()) {
      await exitItem.click();
      await confirmModal(page);
      // 退出场景会整页刷新且 URL 不变：等「演示时间」标记消失（live 模式无标记），
      // 确定性地穿过刷新，避免后续点击落在消亡中的页面上
      await expect(page.getByText('演示时间', { exact: false }).first()).not.toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(1200);
      await avatarMenu(page, '进入固定演示场景');
    } else {
      await page.getByRole('menuitem', { name: '进入固定演示场景' }).click();
    }
    await confirmModal(page);
    // 场景切换后整页刷新；受控模式必须明确展示「演示时间」
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
    await expect(page.getByText('演示时间', { exact: false }).first()).toBeVisible({ timeout: 20_000 });

    // ---------- E02 工作台定位异常与基线 ----------
    // 先读未恢复基线（此步会离开工作台），再回工作台读在线基线并从 KPI 卡进入明细
    const unrecoveredBefore = await unrecoveredTotal(page);
    await navigate(page, '/dashboard');
    await page.waitForLoadState('networkidle');
    const onlineBefore = await onlineKpi(page);
    expect(onlineBefore).toBeGreaterThan(200); // 场景基线：在线 220+ / 243 台
    // KPI 卡可点击进入明细（在线设备 → 设备页），指标与列表同源
    await page.locator('.ant-card', { hasText: '在线设备' }).first().locator('a').first().click();
    await expect(page).toHaveURL(/\/ops\/devices/);

    // ---------- E03 设备详情与地图定位同一对象 ----------
    // 等首屏表格就绪再检索，避免与 ProTable 挂载期的默认请求竞态
    await expect(page.locator('.ant-table-row').first()).toBeVisible({ timeout: 20_000 });
    await page.getByPlaceholder(/设备名.*编号.*城市/).fill('SCN-01');
    await page.getByRole('button', { name: /查\s*询/ }).click();
    const row = page.locator('.ant-table-row').first();
    await expect(row).toContainText('演示 · 主线故障站');
    await row.locator('a').first().click();
    const drawer = page.locator('.ant-drawer-section');
    await expect(drawer).toContainText('离线');
    await expect(drawer).toContainText(MAIN_DEVICE);
    // 详情 → 地图定位：OpenLayers（无需凭据）聚焦该站点并弹详情卡
    await drawer.getByRole('button', { name: /在地图中定位/ }).click();
    await expect(page).toHaveURL(new RegExp(`/map/openlayers\\?focus=${MAIN_DEVICE}`));
    await expect(page.locator('.ol-viewport')).toBeVisible();
    await expect(page.getByText('演示 · 主线故障站').first()).toBeVisible({ timeout: 20_000 });

    // ---------- E04 告警转单并直接打开工单（URL 关键字直达，页面挂载即检索） ----------
    await navigate(page, `/ops/alarms?keyword=${MAIN_ALARM}`);
    const alarmRow = page.locator('.ant-table-row').first();
    await expect(alarmRow).toContainText(MAIN_ALARM);
    await alarmRow.getByRole('button', { name: /处置/ }).click();
    await page.getByRole('menuitem', { name: '转工单' }).click();
    await expect(page.locator('.ant-message')).toContainText('已处置');
    // 返回的工单编号可点击，携带 ID 深链直接打开
    await alarmRow.getByRole('link', { name: MAIN_TICKET }).click();
    await expect(page).toHaveURL(new RegExp(`/ops/tickets\\?focus=${MAIN_TICKET}`));
    await expect(drawer).toBeVisible({ timeout: 15_000 });
    await expect(drawer).toContainText(MAIN_TICKET);
    await expect(drawer).toContainText('待处理');
    // 转单不减未恢复数（F08：转单不等于恢复）
    expect(await unrecoveredTotal(page)).toBe(unrecoveredBefore);

    // ---------- E05 处理与验收（含连续验收下一单） ----------
    await navigate(page, `/ops/tickets?focus=${MAIN_TICKET}`);
    await expect(drawer).toBeVisible({ timeout: 15_000 });
    await expect(drawer).toContainText(MAIN_TICKET);
    // 详情内选择处理人 → 开始处理 → 完成（无需拖拽）
    await drawer.getByText('处理人').locator('..').getByRole('combobox').click();
    await page.keyboard.press('Enter'); // 选第一位可派工人员
    await drawer.locator('.ant-segmented-item', { hasText: '处理中' }).click();
    await expect(page.locator('.ant-message')).toContainText('处理中');
    await drawer.locator('.ant-segmented-item', { hasText: '已完成' }).click();
    await expect(page.locator('.ant-message')).toContainText('已完成');
    await page.keyboard.press('Escape');
    // 签名页验收该工单：进入页面即自动选中第一张待验收（最新完成未验收 = WO-SCN-MAIN）
    await navigate(page, '/components/signature');
    await expect(page.locator('.ant-select', { hasText: MAIN_TICKET }).first()).toBeVisible({ timeout: 15_000 });
    await drawSignature(page);
    await page.getByRole('button', { name: /确认验收/ }).click();
    await expect(page.getByText(`已验收：${MAIN_TICKET}`)).toBeVisible({ timeout: 20_000 });
    // 继续验收自动选择有效下一单（不是刚签完的旧 ID）
    await page.getByRole('button', { name: /继续验收下一单/ }).click();
    // reload 后候选更新需要一点时间：轮询等待选择框离开刚签完的工单（或清空进入完成空态）
    await expect(page.locator('.ant-select').first()).not.toContainText(MAIN_TICKET, { timeout: 15_000 });

    // ---------- E06 指标核对：O+1、U−1 ----------
    await navigate(page, '/dashboard');
    await page.waitForLoadState('networkidle');
    expect(await onlineKpi(page)).toBe(onlineBefore + 1); // 主线设备唯一阻断故障解除 → 上线
    expect(await unrecoveredTotal(page)).toBe(unrecoveredBefore - 1);
    // 主线告警已随工单完成恢复：整页刷新带关键字深链（同时验证刷新后深链仍定位）；
    // 不用站内跳转——上一步留下的「只看未恢复」开关会把已恢复的主线告警过滤掉
    await page.goto(`ops/alarms?keyword=${MAIN_ALARM}`);
    await expect(page.locator('.ant-table-row').first()).toContainText('已恢复');

    // ---------- E07 PDF 与截图（当前演示对象） ----------
    await navigate(page, '/document/pdf');
    await expect(page.locator('.react-pdf__Page').first()).toBeVisible({ timeout: 45_000 });
    await expect(page.getByRole('button', { name: /下载 PDF/ })).toBeEnabled();
    await navigate(page, '/components/screenshot');
    // 可搜索下拉：输入设备编号过滤后回车选中（虚拟列表不适合直接点选项）
    await page.getByRole('combobox').first().click();
    await page.keyboard.type('SCN-01');
    await page.keyboard.press('Enter');
    // getByText 会命中下拉里隐藏的选项文本，断言可见的截图卡片内容（设备名列）
    await expect(page.locator('.ant-descriptions-item', { hasText: '演示 · 主线故障站' }).first()).toBeVisible({
      timeout: 20_000,
    });
    await page.getByRole('button', { name: /截图预览/ }).click();
    await expect(page.locator('.ant-modal img')).toBeVisible({ timeout: 30_000 });

    // ---------- E08 Excel 错误恢复与导入 3 位用户 ----------
    // 并发负载下「下载→上传→预览」链路偶发被消息浮层/慢 IO 打断：整段重试一次（走真实 UI 恢复路径）
    for (let attempt = 1; ; attempt += 1) {
      try {
        await navigate(page, '/document/excel');
        await page.waitForSelector('.ant-upload-drag, .ant-table-row', { timeout: 20_000 });
        await page.getByRole('button', { name: /示例文件/ }).click();
        const invalidDownload = page.waitForEvent('download');
        await page
          .getByRole('menuitem', { name: /全部无效/ })
          .locator('a')
          .click();
        const invalidPath = `/tmp/e2e-users-invalid-r${round}.xlsx`;
        await (await invalidDownload).saveAs(invalidPath);
        await page.locator('input[type="file"]').setInputFiles(invalidPath);
        await expect(page.getByText(/0 行有效/)).toBeVisible({ timeout: 30_000 });
        const reselect = page.getByRole('button', { name: /重新选择文件/ });
        await expect(reselect).toBeEnabled();
        await page.waitForTimeout(1200);
        await reselect.click({ timeout: 10_000 });
        await expect(page.locator('.ant-upload-drag')).toBeVisible({ timeout: 15_000 });
        await page.getByRole('button', { name: /示例文件/ }).click();
        const validDownload = page.waitForEvent('download');
        await page
          .getByRole('menuitem', { name: /全有效/ })
          .locator('a')
          .click();
        const validPath = `/tmp/e2e-users-valid-r${round}.xlsx`;
        await (await validDownload).saveAs(validPath);
        await page.locator('input[type="file"]').setInputFiles(validPath);
        await expect(page.getByText(/3 行有效|有效 3/).first()).toBeVisible({ timeout: 30_000 });
        await page.getByRole('button', { name: /导入 3 条/ }).click();
        await expect(page.locator('.ant-message')).toContainText('导入', { timeout: 30_000 });
        break;
      } catch (error) {
        if (attempt >= 2) throw error;
        await page.waitForTimeout(2000);
      }
    }
    // 用户列表可搜到（服务端真实创建）
    await navigate(page, '/system/users');
    await expect(page.locator('.ant-table-row').first()).toBeVisible({ timeout: 20_000 });
    await page.getByPlaceholder(/姓名.*登录名.*邮箱/).fill('demo.iris');
    await page.getByRole('button', { name: /查\s*询/ }).click();
    await expect(page.locator('.ant-table-row').first()).toContainText('demo.iris');

    // ---------- E09 只读角色差异（数据分析员） ----------
    await avatarMenu(page, '退出登录');
    await page.waitForURL(/login/);
    await page.getByRole('button', { name: /以数据分析员体验/ }).click();
    await page.waitForURL((url) => !url.pathname.endsWith('/login'));
    await navigate(page, '/dashboard');
    await expect(page.locator('.ant-card', { hasText: '在线设备' }).first()).toBeVisible();
    // 数据未被重置：处理结果对只读角色可见
    expect(await onlineKpi(page)).toBe(onlineBefore + 1);
    // 直接进入受限 URL：403；业务可读但处置按钮不渲染（接口层拒绝另有单测覆盖）
    await navigate(page, '/system/users');
    await expect(page.locator('.ant-result-403')).toBeVisible();
    await navigate(page, '/ops/alarms');
    await expect(page.locator('.ant-table-row').first()).toBeVisible();
    await expect(page.locator('.ant-table-row').getByRole('button', { name: /处置/ })).toHaveCount(0);

    // ---------- E10 重置并再次就绪 ----------
    await avatarMenu(page, '退出登录');
    await page.waitForURL(/login/);
    // 等登出状态落定（setInitialState 异步提交）再以管理员一键体验重新进入
    await page.waitForTimeout(1200);
    await page.getByRole('button', { name: /以管理员体验/ }).click();
    await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 30_000 });
    await avatarMenu(page, '重置演示数据');
    // 重置后整页刷新且 URL 不变（本来就在 /dashboard）：只等 URL 会立即通过，随后的站内跳转可能
    // 恰好被刷新吞掉、停回工作台。等刷新真正触发的 load 事件，确定性地穿过它
    const reloaded = page.waitForEvent('load', { timeout: 30_000 });
    await confirmModal(page);
    await reloaded;
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
    // 基线恢复：导入的用户消失、主线告警回到未恢复、在线数回到基线
    await navigate(page, '/system/users');
    await expect(page.locator('.ant-table-row').first()).toBeVisible({ timeout: 20_000 });
    await page.getByPlaceholder(/姓名.*登录名.*邮箱/).fill('demo.iris');
    await page.getByRole('button', { name: /查\s*询/ }).click();
    await expect(page.locator('.ant-table-empty, .ant-empty').first()).toBeVisible({ timeout: 15_000 });
    await navigate(page, `/ops/alarms?keyword=${MAIN_ALARM}`);
    await expect(page.locator('.ant-table-row').first()).toContainText('未恢复');
    await navigate(page, '/dashboard');
    await page.waitForLoadState('networkidle');
    expect(await onlineKpi(page)).toBe(onlineBefore);
    expect(await unrecoveredTotal(page)).toBe(unrecoveredBefore);
    // 全程无未捕获异常 / console 错误 / CSP 违规
    expect(health.pageErrors).toEqual([]);
    expect(health.consoleErrors).toEqual([]);
    expect(await health.csp()).toEqual([]);
  });
}
