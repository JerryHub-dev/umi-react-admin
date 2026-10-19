import { describe, expect, it, vi } from 'vitest';

import type { NavRoute } from '@/utils/routeNav';

vi.mock('@umijs/max', () => ({
  history: { push: vi.fn() },
  useAccess: () => ({}),
  useAppData: () => ({}),
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
}));
vi.mock('antd', () => ({ Input: () => null, Modal: () => null, theme: { useToken: () => ({ token: {} }) } }));

import { filterEntries, flattenNavEntries, type NavEntry } from './index';

const routes: NavRoute[] = [
  { name: 'dashboard', path: '/dashboard' },
  // umi clientRoutes 的布局包裹层没有 name，其子树必须继续遍历（system 组挂在这里验证）
  {
    routes: [
      {
        name: 'system',
        path: '/system',
        routes: [
          { path: '/system', redirect: '/system/users' },
          { name: 'users', path: '/system/users', access: 'systemUserView' },
          { name: 'roles', path: '/system/roles' },
        ],
      },
    ],
  },
  {
    name: 'map',
    path: '/map',
    routes: [
      { name: 'amap', path: '/map/amap' },
      {
        name: 'cesium',
        path: '/map/cesium',
        routes: [
          { path: '/map/cesium', redirect: '/map/cesium/geohash' },
          { name: 'geohash', path: '/map/cesium/geohash' },
          { name: 'situation', path: '/map/cesium/situation' },
        ],
      },
    ],
  },
];

const labelOf = (entry: NavEntry) => entry.keyChain.join('/');

describe('flattenNavEntries', () => {
  it('只取叶子页：分组与场景壳不进面板，重定向占位被跳过', () => {
    const entries = flattenNavEntries(routes);
    expect(entries.map((entry) => entry.path)).toEqual([
      '/dashboard',
      '/system/users',
      '/system/roles',
      '/map/amap',
      '/map/cesium/geohash',
      '/map/cesium/situation',
    ]);
  });

  it('keyChain 携带完整 menu.* 键链，access 透传', () => {
    const entries = flattenNavEntries(routes);
    expect(entries.find((entry) => entry.path === '/map/cesium/geohash')?.keyChain).toEqual([
      'menu.map',
      'menu.map.cesium',
      'menu.map.cesium.geohash',
    ]);
    expect(entries.find((entry) => entry.path === '/system/users')?.access).toBe('systemUserView');
  });

  it('与菜单同口径排除 hideInMenu 与通配路径（登录页、* 兜底 404 不是可直达页面）', () => {
    const entries = flattenNavEntries([
      { name: 'login', path: '/login', hideInMenu: true },
      ...routes,
      { name: 'notFound', path: '*', hideInMenu: true },
      { name: 'detail', path: '/ops/devices/:id' },
    ]);
    expect(entries.map((entry) => entry.path)).not.toEqual(expect.arrayContaining(['/login']));
    expect(entries.map((entry) => entry.path)).toHaveLength(6);
  });
});

describe('filterEntries', () => {
  it('空查询返回全部；按文案与路径大小写不敏感匹配', () => {
    const entries = flattenNavEntries(routes);
    expect(filterEntries(entries, '', labelOf)).toHaveLength(6);
    expect(filterEntries(entries, 'CESIUM', labelOf).map((entry) => entry.path)).toEqual([
      '/map/cesium/geohash',
      '/map/cesium/situation',
    ]);
    expect(filterEntries(entries, '/system/roles', labelOf).map((entry) => entry.path)).toEqual(['/system/roles']);
    expect(filterEntries(entries, '不存在', labelOf)).toEqual([]);
  });
});
