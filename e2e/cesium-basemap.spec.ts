import { expect, navigate, signIn, test } from './fixtures';

/**
 * F01 回归：正式构建中六个 Cesium 场景的底图真实可加载（connect-src 已放行），
 * 且瓦片失败时出现可见说明与重试，而不是静默留下无地理参照的业务图层。
 * Cesium 无 ion token 时默认「夜航滤镜」OSM，carto 探针通过后升级 CartoDB Dark Matter，
 * OSM 不可达再兜底高德——前两条是常态链路，要验证真实加载。OpenLayers 页的瓦片走 <img>（img-src），一并核对。
 */

const CESIUM_ROUTES = [
  '/map/cesium/geohash',
  '/map/cesium/direction',
  '/map/cesium/heatmap',
  '/map/cesium/trajectory',
  '/map/cesium/select',
  '/map/cesium/situation',
];

const TILE_HOSTS = /basemaps\.cartocdn\.com|tile\.openstreetmap\.org/;

for (const path of CESIUM_ROUTES) {
  test(`Cesium 底图瓦片真实加载：${path}`, async ({ page, health }) => {
    await signIn(page);
    const tiles: string[] = [];
    page.on('response', (response) => {
      if (TILE_HOSTS.test(response.url())) tiles.push(`${response.status()}`);
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

test('Cesium 瓦片失败分支：三级底图全部不可达时失败可见', async ({ page }) => {
  await signIn(page);
  // 可控失败：拦截并中断 OSM、carto 升级与高德终极兜底三条链路（模拟离线/受限网络，不伪造加载成功）。
  // 只拦前两条时高德探针在 CI 正常网络下可达（200 + ACAO *），兜底换层成功，横幅不会出现
  await page.route(/basemaps\.cartocdn\.com|tile\.openstreetmap\.org|\.autonavi\.com/, (route) => route.abort());
  await navigate(page, '/map/cesium/geohash');
  await expect(page.getByText('底图瓦片加载失败')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: /重试底图/ })).toBeVisible();
});
