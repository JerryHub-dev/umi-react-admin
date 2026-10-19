import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NavRoute } from '@/utils/routeNav';

const state = vi.hoisted(() => ({ chain: [] as NavRoute[], pathname: '/', access: {} as Record<string, boolean> }));
const menuProps = vi.hoisted(() => ({
  last: undefined as { selectedKeys?: string[]; items?: { key: string }[] } | undefined,
}));

vi.mock('@/utils/routeNav', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/routeNav')>()),
  useNamedChain: () => state.chain,
}));
vi.mock('@umijs/max', () => ({
  history: { push: vi.fn() },
  useAccess: () => state.access,
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
  useLocation: () => ({ pathname: state.pathname }),
}));
vi.mock('antd', async () => {
  const React = await import('react');
  return {
    ConfigProvider: ({ children }: { children?: React.ReactNode }) => children,
    Menu: (props: { selectedKeys?: string[]; items?: { key: string; label?: string }[] }) => {
      menuProps.last = props;
      return React.createElement(
        'ul',
        null,
        props.items?.map((item) => React.createElement('li', { key: item.key }, item.label)),
      );
    },
    theme: { useToken: () => ({ token: { colorBgContainer: '#fff', colorBorderSecondary: '#eee', paddingLG: 24 } }) },
  };
});

beforeEach(() => {
  state.chain = [];
  state.pathname = '/';
  state.access = {};
  menuProps.last = undefined;
});

const systemGroup: NavRoute = {
  name: 'system',
  path: '/system',
  routes: [
    { name: 'users', path: '/system/users', access: 'systemUserView' },
    { name: 'roles', path: '/system/roles' },
    { name: 'logs', path: '/system/logs' },
  ],
};

describe('GroupNav', () => {
  it('分组页渲染二级导航，文案用 menu.<组>.<名> 键', async () => {
    state.chain = [systemGroup, { name: 'users', path: '/system/users' }];
    state.pathname = '/system/users';
    state.access = { systemUserView: true };
    const { default: GroupNav } = await import('./index');
    const html = renderToStaticMarkup(<GroupNav />);
    expect(html).toContain('menu.system.users');
    expect(html).toContain('menu.system.roles');
    expect(menuProps.last?.selectedKeys).toEqual(['/system/users']);
  });

  it('access 为 false 的子项不渲染（与 ProLayout 菜单同口径）', async () => {
    state.chain = [systemGroup, { name: 'roles', path: '/system/roles' }];
    state.pathname = '/system/roles';
    state.access = { systemUserView: false };
    const { default: GroupNav } = await import('./index');
    const html = renderToStaticMarkup(<GroupNav />);
    expect(html).not.toContain('menu.system.users');
    expect(html).toContain('menu.system.logs');
    expect(menuProps.last?.selectedKeys).toEqual(['/system/roles']);
  });

  it('access 键在 useAccess 里缺失时同样不渲染（plugin-access 把它标成不可访问，菜单里也看不到）', async () => {
    state.chain = [systemGroup, { name: 'roles', path: '/system/roles' }];
    state.pathname = '/system/roles';
    state.access = {};
    const { default: GroupNav } = await import('./index');
    const html = renderToStaticMarkup(<GroupNav />);
    expect(html).not.toContain('menu.system.users');
    expect(html).toContain('menu.system.roles');
  });

  it('当前页不在可见子项中（重定向瞬态帧）保持挂载、空选中；单页（dashboard）不渲染', async () => {
    const { default: GroupNav } = await import('./index');
    state.chain = [{ name: 'dashboard', path: '/dashboard' }];
    expect(renderToStaticMarkup(<GroupNav />)).toBe('');
    // 分组根路径的重定向瞬态帧（真实应用一帧后落到 /system/users）：导航条不应卸载
    state.chain = [systemGroup, { name: 'users', path: '/system/users' }];
    state.pathname = '/system';
    state.access = { systemUserView: true };
    const html = renderToStaticMarkup(<GroupNav />);
    expect(html).toContain('menu.system.users');
    expect(menuProps.last?.selectedKeys).toEqual([]);
  });

  it('三级路径选中前缀最长的二级项（/map/cesium/geohash → /map/cesium）', async () => {
    state.chain = [
      {
        name: 'map',
        path: '/map',
        routes: [
          { name: 'amap', path: '/map/amap' },
          { name: 'cesium', path: '/map/cesium' },
        ],
      },
      { name: 'cesium', path: '/map/cesium' },
      { name: 'geohash', path: '/map/cesium/geohash' },
    ];
    state.pathname = '/map/cesium/geohash';
    const { default: GroupNav } = await import('./index');
    renderToStaticMarkup(<GroupNav />);
    expect(menuProps.last?.selectedKeys).toEqual(['/map/cesium']);
  });
});
