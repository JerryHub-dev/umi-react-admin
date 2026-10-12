// @vitest-environment jsdom
import { AUTH_TOKEN_KEY } from '@/constants';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock('@/services/auth', () => ({ fetchCurrentUser: fetchMock }));

const loadState = async (demoMode: boolean) => {
  vi.resetModules();
  vi.stubGlobal('UMI_APP_DEMO_MODE', demoMode);
  return import('./initialState');
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  fetchMock.mockResolvedValue({ name: 'alice', email: '', role: 'admin' });
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('authentication bootstrap', () => {
  it('loads real cookie sessions without a JavaScript bearer and removes legacy credentials', async () => {
    const { getInitialState } = await loadState(false);
    localStorage.setItem(AUTH_TOKEN_KEY, 'old-persistent-bearer');
    sessionStorage.setItem(AUTH_TOKEN_KEY, 'stale-demo-token');
    expect(await getInitialState()).toMatchObject({ name: 'alice', role: 'admin' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it('does not promote an old persistent bearer to a demo session', async () => {
    const { getInitialState } = await loadState(true);
    localStorage.setItem(AUTH_TOKEN_KEY, 'old-demo-token');
    expect(await getInitialState()).toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it('preserves an explicit tab-local demo session across application bootstrap', async () => {
    const { getInitialState } = await loadState(true);
    sessionStorage.setItem(AUTH_TOKEN_KEY, 'demo-session');
    expect(await getInitialState()).toMatchObject({ name: 'alice' });
    expect(await getInitialState()).toMatchObject({ name: 'alice' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to unauthenticated state when the real session cannot be verified', async () => {
    const { getInitialState } = await loadState(false);
    fetchMock.mockRejectedValue(new Error('401'));
    expect(await getInitialState()).toBeUndefined();
  });

  it('cookie bootstrap remains available when browser storage is disabled', async () => {
    const { getInitialState } = await loadState(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('disabled');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('disabled');
    });
    expect(await getInitialState()).toMatchObject({ name: 'alice', theme: 'light' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
