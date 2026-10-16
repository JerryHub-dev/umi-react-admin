// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readRememberedName, REMEMBERED_NAME_KEY, writeRememberedName } from './rememberedName';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('记住账号', () => {
  it('只记用户名（去掉首尾空白），传空即忘掉', () => {
    expect(readRememberedName()).toBe('');
    writeRememberedName('  ops.lee ');
    expect(localStorage.getItem(REMEMBERED_NAME_KEY)).toBe('ops.lee');
    expect(readRememberedName()).toBe('ops.lee');
    writeRememberedName(undefined);
    expect(readRememberedName()).toBe('');
    writeRememberedName('   ');
    expect(localStorage.getItem(REMEMBERED_NAME_KEY)).toBeNull();
  });

  it('存储不可用时静默降级', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(readRememberedName()).toBe('');
    expect(() => writeRememberedName('ops.lee')).not.toThrow();
  });
});
