// @vitest-environment jsdom
import { AUTH_TOKEN_KEY } from '@/constants';
import { issueDemoToken } from '@/demo/token';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));
vi.mock('./client', () => ({ api: apiMock }));
vi.mock('@/utils/i18n', () => ({ t: (key: string) => key }));

const user = { name: 'alice', email: 'alice@example.test', role: 'admin' };
const loadAuth = async (demoMode: boolean) => {
  vi.resetModules();
  vi.stubGlobal('UMI_APP_DEMO_MODE', demoMode);
  return import('./auth');
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('cookie and demo authentication contracts', () => {
  it('cannot dispatch the demo reset endpoint in real mode', async () => {
    await loadAuth(false);
    const { resetDemoData } = await import('./system');
    expect(() => resetDemoData()).toThrow('disabled in real mode');
    expect(apiMock).not.toHaveBeenCalled();
  });

  it('preserves explicit demo reset calls', async () => {
    await loadAuth(true);
    const { resetDemoData } = await import('./system');
    apiMock.mockResolvedValue(null);
    await expect(resetDemoData()).resolves.toBeNull();
    expect(apiMock).toHaveBeenCalledWith('/api/v1/demo/reset', { method: 'POST' });
  });

  it('real login returns validated user information without reading or persisting a bearer', async () => {
    const auth = await loadAuth(false);
    apiMock.mockResolvedValue({ user, token: 'legacy-backend-bearer' });
    const get = vi.spyOn(Storage.prototype, 'getItem');
    const set = vi.spyOn(Storage.prototype, 'setItem');
    expect(await auth.login({ name: 'alice', password: 'secret' })).toEqual({ user });
    expect(get).not.toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
    expect(apiMock).toHaveBeenCalledWith(
      '/api/v1/login',
      expect.objectContaining({ method: 'POST', skipErrorHandler: true }),
    );
  });

  it.each([
    undefined,
    {},
    { ...user, name: '' },
    { ...user, name: ' ' },
    { ...user, name: '\nalice' },
    { ...user, role: {} },
  ])('rejects invalid real user claims before they enter authenticated state: %j', async (claim) => {
    const auth = await loadAuth(false);
    apiMock.mockResolvedValue({ user: claim });
    await expect(auth.login({ name: 'alice', password: 'secret' })).rejects.toThrow('login.invalidSession');
  });

  it('queries a real server session without a JavaScript token', async () => {
    const auth = await loadAuth(false);
    apiMock.mockResolvedValue(user);
    expect(await auth.fetchCurrentUser()).toEqual(user);
    expect(apiMock).toHaveBeenCalledWith('/api/v1/currentUser', { skipErrorHandler: true });
  });

  it('propagates failed real sign-out rather than claiming to revoke the server cookie', async () => {
    const auth = await loadAuth(false);
    const error = new Error('offline');
    apiMock.mockRejectedValue(error);
    await expect(auth.logout()).rejects.toBe(error);
  });

  it('keeps a demo token only in the current tab and clears it on best-effort sign-out', async () => {
    const auth = await loadAuth(true);
    const token = issueDemoToken('alice');
    apiMock.mockResolvedValue({ user, token });
    expect(await auth.login({ name: 'alice', password: 'demo' })).toEqual({ user });
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBe(token);
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    apiMock.mockRejectedValue(new Error('offline'));
    await expect(auth.logout()).resolves.toBeUndefined();
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it('rejects ordinary backend bearers in explicit demo mode', async () => {
    const auth = await loadAuth(true);
    apiMock.mockResolvedValue({ user, token: 'real-bearer' });
    await expect(auth.login({ name: 'alice', password: 'demo' })).rejects.toThrow('login.invalidSession');
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it('reports unavailable tab storage rather than leaving a partial demo login', async () => {
    const auth = await loadAuth(true);
    apiMock.mockResolvedValue({ user, token: issueDemoToken('alice') });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('disabled');
    });
    await expect(auth.login({ name: 'alice', password: 'demo' })).rejects.toThrow('login.storageError');
  });
});
