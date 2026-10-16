import { describe, expect, it } from 'vitest';
import { LEGACY_REDIRECTS, routes } from '../../config/routes';
import enUS from '../locales/en-US';
import zhCN from '../locales/zh-CN';
import { APP_TITLE, menuKeyOf, pageTitle } from './pageTitle';

type Route = (typeof routes)[number];

describe('页面标题', () => {
  it('跳过没有 name 的布局层与重定向，按菜单规则拼键', () => {
    expect(menuKeyOf([{}, { name: 'system' }, { name: 'users' }])).toBe('menu.system.users');
    expect(menuKeyOf([{ name: 'login' }])).toBe('menu.login');
    expect(menuKeyOf([{ name: 'map' }, {}])).toBe('menu.map');
    expect(menuKeyOf([{}, { name: '' }])).toBeUndefined();
    expect(pageTitle('工作台')).toBe(`工作台 - ${APP_TITLE}`);
    expect(pageTitle()).toBe(APP_TITLE);
  });

  it('每个页面路由（含登录页与兜底 404）都能得到中英文标题', () => {
    const missing: string[] = [];
    const walk = (list: Route[], chain: Route[]) =>
      list.forEach((route) => {
        if (route.path in LEGACY_REDIRECTS) return;
        const next = [...chain, route];
        if (route.component) {
          const key = menuKeyOf(next);
          if (!key || !(zhCN as Record<string, string>)[key] || !(enUS as Record<string, string>)[key]) {
            missing.push(`${route.path} -> ${key}`);
          }
        }
        walk(route.routes ?? [], next);
      });
    walk(routes, []);
    // /map 是运行期决定去向的跳转页，标题落在分组名「地图」上
    expect(missing).toEqual([]);
  });
});
