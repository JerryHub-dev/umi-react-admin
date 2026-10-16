import type { RoleKey } from '@/services/types';
import { describe, expect, it } from 'vitest';
import { ROLE_KEYS, canManageAccount } from './permissions';

/**
 * 账号维护范围：演示后端（PUT / DELETE / 批量）与用户页（按钮置灰、批量勾选）共用 canManageAccount，
 * 这里把判定口径钉死，两边任何一边改错都会在这里或 security-boundary.test.ts 失败。
 */
const target = (role: RoleKey) => ({ role });

describe('canManageAccount：admin / lead 账号只由管理员角色维护', () => {
  it('管理员角色可以维护全部五种角色的账号', () => {
    for (const role of ROLE_KEYS) {
      expect(canManageAccount({ roleKey: 'admin', role: 'admin' }, target(role)), `admin → ${role}`).toBe(true);
    }
  });

  it('委派角色（含 lead 自己）只能维护可分配范围内的账号', () => {
    for (const roleKey of ['lead', 'operator', 'analyst', 'viewer'] as const) {
      const caller = { roleKey, role: 'user' };
      expect(canManageAccount(caller, target('admin')), `${roleKey} → admin`).toBe(false);
      expect(canManageAccount(caller, target('lead')), `${roleKey} → lead`).toBe(false);
      for (const role of ['viewer', 'operator', 'analyst'] as const) {
        expect(canManageAccount(caller, target(role)), `${roleKey} → ${role}`).toBe(true);
      }
    }
  });

  it('有业务角色时只看业务角色：签发角色写成 admin 也不能冒充', () => {
    expect(canManageAccount({ roleKey: 'viewer', role: 'admin' }, target('lead'))).toBe(false);
  });

  it('没有业务角色（无种子记录的演示登录名）时按签发角色判定', () => {
    expect(canManageAccount({ role: 'admin' }, target('lead'))).toBe(true);
    expect(canManageAccount({ role: 'user' }, target('lead'))).toBe(false);
    expect(canManageAccount(undefined, target('admin'))).toBe(false);
    expect(canManageAccount(undefined, target('operator'))).toBe(true);
  });
});
