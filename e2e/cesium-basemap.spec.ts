import { expect, navigate, signIn, test } from './fixtures';

/**
 * F01 回归：正式构建中六个 Cesium 场景的 OSM 底图真实可加载（connect-src 已放行），
 * 且瓦片失败时出现可见说明与重试，而不是静默留下无地理参照的业务图层。
 * OpenLayers 页的瓦片走 <img>（img-src），一并核对。
 */

const CESIUM_ROUTES = [
  '/map/cesium/geohash',
  '/map/cesium/direction',
  '/map/cesium/heatmap',
  '/map/cesium/trajectory',
  '/map/cesium/select',
  '/map/cesium/situation',
];

for (const path of CESIUM_ROUTES) {
  test(`Cesium 底图瓦片真实加载：${path}`, async ({ page, health }) => {
    await signIn(page);
    const tiles: string[] = [];
    page.on('response', (response) => {
      if (response.url().includes('tile.openstreetmap.org')) tiles.push(`${response.status()}`);
    });
    await navigate(page, path);
    // 软件渲染下给足时间；真实瓦片请求以网络为准，不以 canvas 存在为满足
    await expect.poll(() => tiles.length, { timeout: 30_000 }).toBeGreaterThan(0);
    expect(tiles.every((status) => status === '200')).toBe(true);
    await expect(page.locator('.cesium-widget canvas').first()).toBeVisible();
    expect(await health.csp()).toEqual([]);
    expect(health.pageErrors).toEqual([]);
  });
}

test('OpenLayers 底图瓦片加载（img-src）', async ({ page, health }) => {
  await signIn(page);
  const tiles: number[] = [];
  page.on('response', (response) => {
    if (response.url().includes('tile.openstreetmap.org')) tiles.push(response.status());
  });
  await navigate(page, '/map/openlayers');
  await expect.poll(() => tiles.length, { timeout: 30_000 }).toBeGreaterThan(0);
  expect(await health.csp()).toEqual([]);
});

test('Cesium 瓦片失败分支：可见说明与重试入口', async ({ page }) => {
  await signIn(page);
  // 可控失败：拦截并中断所有 OSM 瓦片请求（模拟离线/受限网络，不伪造加载成功）
  await page.route(/tile\.openstreetmap\.org/, (route) => route.abort());
  await navigate(page, '/map/cesium/geohash');
  await expect(page.getByText('底图瓦片加载失败')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: /重试底图/ })).toBeVisible();
});
