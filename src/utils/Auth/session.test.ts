// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** DEMO_MODE 是模块级常量：用 getter 让每个用例切换真实/demo 两种运行模式 */
const mode = vi.hoisted(() => ({ demo: true }));
vi.mock('@/demo/mode', () => ({
  get DEMO_MODE() {
    return mode.demo;
  },
}));

import { AUTH_TOKEN_KEY } from '@/constants';
import { clearDemoToken, readDemoToken, removeLegacyToken, saveDemoToken } from './session';

beforeEach(() => {
  mode.demo = true;
  window.localStorage.clear();
  window.sessionStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

/**
 * 会话存储是认证边界：demo 会话只能落在 sessionStorage，真实模式不得读取任何遗留凭据，
 * 存储被禁用（隐私模式）时也必须按「未认证」处理而不是把页面打挂。
 */
describe('demo session storage', () => {
  it('round-trips a demo token in sessionStorage only', () => {
    saveDemoToken('token-1');

    expect(window.sessionStorage.getItem(AUTH_TOKEN_KEY)).toBe('token-1');
    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(readDemoToken()).toBe('token-1');

    clearDemoToken();
    expect(readDemoToken()).toBe('');
  });

  it('never reads or writes a session token outside demo mode', () => {
    window.sessionStorage.setItem(AUTH_TOKEN_KEY, 'leftover');
    mode.demo = false;

    expect(readDemoToken()).toBe('');
    expect(() => saveDemoToken('nope')).toThrow(/Demo sessions are disabled/);
    // 真实模式不得覆盖/清理用户浏览器里已有的值以外的语义：写入被拒绝，原值仍在
    expect(window.sessionStorage.getItem(AUTH_TOKEN_KEY)).toBe('leftover');
  });

  it('removes the legacy persistent token on migration', () => {
    window.localStorage.setItem(AUTH_TOKEN_KEY, 'legacy-bearer');

    removeLegacyToken();

    expect(window.localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
  });

  it('treats unavailable storage as unauthenticated instead of throwing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(readDemoToken()).toBe('');
    expect(() => clearDemoToken()).not.toThrow();
    expect(() => removeLegacyToken()).not.toThrow();
  });
});
