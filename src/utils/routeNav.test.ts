import { describe, expect, it, vi } from 'vitest';

vi.mock('@umijs/max', () => ({ matchRoutes: vi.fn(), useAppData: vi.fn(), useLocation: vi.fn() }));

import { canAccessRoute, firstAccessibleLeaf, type NavRoute } from './routeNav';

/** ProLayout 菜单数据形态：子项在 children，无权限的项带 unaccessible（且 name 已被删掉） */
const system: NavRoute = {
  name: 'system',
  path: '/system',
  children: [
    { path: '/system', redirect: '/system/users' },
    { path: '/system/users', unaccessible: true },
    { path: '/system/roles', unaccessible: true },
    { name: 'access', path: '/system/access' },
  ],
};

describe('firstAccessibleLeaf', () => {
  it('跳过不可访问与重定向占位，落到第一个可访问子页（而不是静态 redirect 的 403 页）', () => {
    expect(firstAccessibleLeaf(system)).toBe('/system/access');
  });

  it('有权限时取第一项；嵌套分组（clientRoutes 的 routes 形态）递归到叶子', () => {
    const map: NavRoute = {
      name: 'map',
      path: '/map',
      routes: [
        { name: 'amap', path: '/map/amap', hideInMenu: true },
        {
          name: 'cesium',
          path: '/map/cesium',
          routes: [
            { path: '/map/cesium', redirect: '/map/cesium/geohash' },
            { name: 'geohash', path: '/map/cesium/geohash' },
          ],
        },
      ],
    };
    expect(firstAccessibleLeaf(map)).toBe('/map/cesium/geohash');
    expect(firstAccessibleLeaf({ ...system, children: [{ name: 'users', path: '/system/users' }] })).toBe(
      '/system/users',
    );
  });

  it('整组都不可访问时返回 undefined（调用方回退到分组路径）', () => {
    expect(
      firstAccessibleLeaf({ ...system, children: [{ path: '/system/users', unaccessible: true }] }),
    ).toBeUndefined();
    expect(firstAccessibleLeaf({ name: 'x', path: '/x', unaccessible: true })).toBeUndefined();
  });
});

describe('canAccessRoute', () => {
  it('与 plugin-access 同口径：无键放行，布尔取值，函数按路由调用，键缺失不可访问', () => {
    const access = { yes: true, no: false, byRoute: (route: NavRoute) => route.access === 'byRoute' };
    expect(canAccessRoute(access, {})).toBe(true);
    expect(canAccessRoute(access, { access: 'yes' })).toBe(true);
    expect(canAccessRoute(access, { access: 'no' })).toBe(false);
    expect(canAccessRoute(access, { access: 'byRoute' })).toBe(true);
    expect(canAccessRoute(access, { access: 'typoView' })).toBe(false);
  });
});
