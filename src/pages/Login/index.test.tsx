import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const route = vi.hoisted(() => ({ search: '' }));

type TestRoute = { path: string; name?: string };
const CLIENT_ROUTES: TestRoute[] = [{ path: '/system/users', name: 'users' }];

vi.mock('@umijs/max', () => ({
  history: { replace: vi.fn() },
  // 每个文案键都「存在」：断言里直接比对键名
  useIntl: () => ({
    formatMessage: ({ id }: { id: string }) => id,
    messages: new Proxy({}, { get: (_target, key) => String(key) }),
  }),
  useAppData: () => ({ clientRoutes: CLIENT_ROUTES }),
  matchRoutes: (routes: TestRoute[], path: string) => {
    const found = routes.find((item) => item.path === path);
    return found ? [{ route: found }] : null;
  },
  useLocation: () => ({ search: route.search }),
  useModel: () => ({ initialState: undefined, setInitialState: vi.fn() }),
  getLocale: () => 'en-US',
  setLocale: vi.fn(),
}));
vi.mock('@/hooks/useThemeMode', () => ({ useThemeMode: () => ({ dark: false, toggle: vi.fn() }) }));
vi.mock('@/services/auth', () => ({ login: vi.fn() }));
vi.mock('@/utils/Auth/initialState', () => ({ readTheme: () => 'light' }));

const renderLogin = async (demoMode: boolean, search = '') => {
  vi.resetModules();
  route.search = search;
  vi.stubGlobal('UMI_APP_DEMO_MODE', demoMode);
  vi.stubGlobal('PUBLIC_PATH', '/');
  vi.stubGlobal('BUILD_INFO', { sha: '0123456789abcdef', time: '2026-10-16T08:00:00Z', target: 'github-pages' });
  const { default: Login } = await import('./index');
  return renderToStaticMarkup(<Login />);
};
afterEach(() => vi.unstubAllGlobals());

describe('sign-in mode entry points', () => {
  it('real login renders empty credentials without demo identity shortcuts', { timeout: 20_000 }, async () => {
    const html = await renderLogin(false);
    expect(html).not.toContain('login.asAdmin');
    expect(html).not.toContain('login.asGuest');
    expect(html).not.toContain('login.demoHint');
    expect(html).not.toContain('value="admin"');
    expect(html).not.toContain('value="demo"');
    expect(html).toContain('login.submit');
    // 真实登录：记住账号与找回密码说明；不指向模板仓库
    expect(html).toContain('login.remember');
    expect(html).toContain('login.forgot');
    expect(html).not.toContain('login.repo');
    expect(html).not.toContain('login.expired');
  });

  it(
    'explicit demo mode preserves administrator, viewer and arbitrary-name workflows',
    { timeout: 20_000 },
    async () => {
      const html = await renderLogin(true);
      expect(html).toContain('login.asAdmin');
      // 五种角色的快捷体验入口（F02）：值班长 / 运维工程师 / 数据分析员 / 访客
      expect(html).toContain('login.as.lead');
      expect(html).toContain('login.as.operator');
      expect(html).toContain('login.as.analyst');
      expect(html).toContain('login.as.guest');
      expect(html).toContain('login.demoHint');
      expect(html).toContain('value="admin"');
      expect(html).toContain('value="demo"');
      // 演示站：源码入口；任意密码都能登录，不出现记住账号 / 找回密码
      expect(html).toContain('login.repo');
      expect(html).not.toContain('login.remember');
      expect(html).not.toContain('login.forgot');
    },
  );

  it('session expiry sent back by the request layer shows a persistent notice', { timeout: 20_000 }, async () => {
    const html = await renderLogin(false, '?redirect=%2Fsystem%2Fusers&reason=expired');
    expect(html).toContain('login.expired');
    expect(html).toContain('ant-alert-warning');
    // 带回跳地址时说明登录后回到哪一页，替代默认副标题
    expect(html).toContain('login.returnTo');
    expect(html).not.toContain('login.subtitle');
    expect(await renderLogin(false)).toContain('login.subtitle');
    // 未知原因不展示任何提示
    expect(await renderLogin(false, '?reason=whatever')).not.toContain('ant-alert');
  });

  it('footer shows the build the page was served from', { timeout: 20_000 }, async () => {
    const html = await renderLogin(true);
    expect(html).toContain('footer.build');
    expect(html).toContain('0123456');
    expect(html).toContain('/commit/0123456789abcdef');
  });
});
