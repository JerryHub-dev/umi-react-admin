import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@umijs/max', () => ({
  history: { replace: vi.fn() },
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
  useLocation: () => ({ search: '' }),
  useModel: () => ({ initialState: undefined, setInitialState: vi.fn() }),
  getLocale: () => 'en-US',
  setLocale: vi.fn(),
}));
vi.mock('@/hooks/useThemeMode', () => ({ useThemeMode: () => ({ dark: false, toggle: vi.fn() }) }));
vi.mock('@/services/auth', () => ({ login: vi.fn() }));
vi.mock('@/utils/Auth/initialState', () => ({ readTheme: () => 'light' }));

const renderLogin = async (demoMode: boolean) => {
  vi.resetModules();
  vi.stubGlobal('UMI_APP_DEMO_MODE', demoMode);
  vi.stubGlobal('PUBLIC_PATH', '/');
  const { default: Login } = await import('./index');
  return renderToStaticMarkup(<Login />);
};
afterEach(() => vi.unstubAllGlobals());

describe('sign-in mode entry points', () => {
  it('real login renders empty credentials without demo identity shortcuts', async () => {
    const html = await renderLogin(false);
    expect(html).not.toContain('login.asAdmin');
    expect(html).not.toContain('login.asGuest');
    expect(html).not.toContain('login.demoHint');
    expect(html).not.toContain('value="admin"');
    expect(html).not.toContain('value="demo"');
    expect(html).toContain('login.submit');
  });

  it('explicit demo mode preserves administrator, viewer and arbitrary-name workflows', async () => {
    const html = await renderLogin(true);
    expect(html).toContain('login.asAdmin');
    expect(html).toContain('login.asGuest');
    expect(html).toContain('login.demoHint');
    expect(html).toContain('value="admin"');
    expect(html).toContain('value="demo"');
  });
});
