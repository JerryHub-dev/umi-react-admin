import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { logoutMock, stateMock, successMock, errorMock, pushMock, account } = vi.hoisted(() => ({
  logoutMock: vi.fn(),
  stateMock: vi.fn(),
  successMock: vi.fn(),
  errorMock: vi.fn(),
  pushMock: vi.fn(),
  account: { click: undefined as ((value: { key: string }) => unknown) | undefined },
}));
vi.mock('@/services/auth', () => ({ logout: logoutMock }));
vi.mock('@/services/system', () => ({
  resetDemoData: vi.fn(),
  getDemoClock: vi.fn().mockResolvedValue({ mode: 'live', demoTime: '2026-10-12T00:00:00.000Z' }),
  switchDemoScenario: vi.fn(),
}));
vi.mock('@/components/GuideTour', () => ({ OPEN_TOUR_EVENT: 'tour' }));
vi.mock('@/hooks/useThemeMode', () => ({ useThemeMode: () => ({ dark: false, toggle: vi.fn() }) }));
vi.mock('@umijs/max', () => ({
  history: { push: pushMock },
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
  useModel: () => ({ initialState: { name: 'alice' }, setInitialState: stateMock }),
  getLocale: () => 'en-US',
  setLocale: vi.fn(),
  useAccess: () => ({ permission: (key: string) => key === 'system.demo.reset' }),
}));
vi.mock('antd', async () => {
  const React = await import('react');
  const wrapper = ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children);
  return {
    App: { useApp: () => ({ message: { success: successMock, error: errorMock }, modal: { confirm: vi.fn() } }) },
    Avatar: wrapper,
    Button: wrapper,
    Tooltip: wrapper,
    Tag: wrapper,
    Dropdown: ({
      children,
      menu,
    }: {
      children?: React.ReactNode;
      menu: { items?: { key?: string }[]; onClick?: (value: { key: string }) => unknown };
    }) => {
      if (menu.items?.some((item) => item.key === 'logout')) account.click = menu.onClick;
      return React.createElement('span', null, children);
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('UMI_APP_DEMO_MODE', false);
});
afterEach(() => vi.unstubAllGlobals());

const clickSignOut = async () => {
  const { default: RightContent } = await import('./RightContent');
  renderToStaticMarkup(<RightContent />);
  account.click?.({ key: 'logout' });
};

describe('server-cookie sign-out UI', () => {
  it('preserves authenticated state and reports failed revocation', async () => {
    logoutMock.mockRejectedValue(new Error('offline'));
    await clickSignOut();
    await vi.waitFor(() => expect(errorMock).toHaveBeenCalledWith('header.logoutFailed'));
    expect(stateMock).not.toHaveBeenCalled();
    expect(successMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('clears state and redirects only after the server confirms sign-out', async () => {
    logoutMock.mockResolvedValue(undefined);
    stateMock.mockResolvedValue(undefined);
    await clickSignOut();
    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith('/login'));
    expect(stateMock).toHaveBeenCalledWith(undefined);
    expect(successMock).toHaveBeenCalledWith('header.loggedOut');
    expect(errorMock).not.toHaveBeenCalled();
  });
});
