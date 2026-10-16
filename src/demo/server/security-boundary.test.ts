/**
 * 安全边界回归（2026-10-14 安全扫描 F1 / F2 / F7 / F8 / F11 / F12）。
 *
 * 全部经 createDemoServer 的 HTTP 接口验证——与页面调用的是同一个入口，
 * 不从 UI 层或路由内部函数绕过去，这样「只修 UI 不修 API」的实现会在这里失败。
 */
import {
  ASSIGNABLE_ROLE_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_KEYS,
  USER_IMPORT_LIMITS,
} from '@/constants/permissions';
import type { Device, OperationLog, UserImportResult } from '@/services/types';
import { deflateSync } from 'node:zlib';
import { beforeEach, describe, expect, it } from 'vitest';
import { STORE_KEY, type StorageLike } from '../store';
import { issueDemoToken } from '../token';
import { createDemoServer } from './index';

const NOW = new Date(2026, 9, 14, 10, 0);

const memoryStorage = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
};

let storage: ReturnType<typeof memoryStorage>;
let server: ReturnType<typeof createDemoServer>;

beforeEach(() => {
  storage = memoryStorage();
  server = createDemoServer({ locale: 'zh-CN', storage, now: () => new Date(NOW) });
});

const call = (method: string, url: string, options: { body?: unknown; token?: string; params?: object } = {}) =>
  server.handle({
    method,
    url,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    params: options.params as Record<string, unknown>,
    headers: { Authorization: options.token ? `Bearer ${options.token}` : undefined },
  });

const loginAs = (name: string) =>
  call('POST', '/api/v1/login', { body: { name, password: 'x' } }).body.data as {
    token: string;
    user: { roleKey?: string; permissions: string[] };
  };

const data = () => server.store.dataset;
const userByName = (username: string) => data().users.find((u) => u.username === username);
const roleById = (id: string) => data().roles.find((r) => r.id === id);
const logs = (): OperationLog[] => data().logs;
const logsOf = (action: OperationLog['action']) => logs().filter((log) => log.action === action);

/**
 * 造一个「定制角色」持有者：把 viewer 记录改成给定权限集，
 * 再用该角色的体验账号登录——得到一条真实的（非构造的）会话。
 */
const loginWithCustomPermissions = (permissions: string[], username = 'guest') => {
  server.store.update('roles', 'viewer', { permissions, updatedAt: NOW.toISOString() });
  return loginAs(username);
};

// ------------------------------------------------ F1 角色自我提升

describe('F1 用户资料更新不能让调用者提升自己的角色', () => {
  it('只有 system.user.update 的定制角色可以更新允许的资料字段', () => {
    const session = loginWithCustomPermissions(['system.user.view', 'system.user.update']);
    const target = userByName('operator')!;
    const res = call('PUT', `/api/v1/users/${target.id}`, {
      token: session.token,
      body: { name: '改过的名字', email: 'changed@example.com' },
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(userByName('operator')!.name).toBe('改过的名字');
    expect(userByName('operator')!.email).toBe('changed@example.com');
  });

  it('只有 system.user.update 的定制角色不能把任何人改成 admin', () => {
    const session = loginWithCustomPermissions(['system.user.view', 'system.user.update']);
    const target = userByName('operator')!;
    const res = call('PUT', `/api/v1/users/${target.id}`, { token: session.token, body: { role: 'admin' } });
    // 授权拒绝走真正的 HTTP 403（不是 200 + success:false），调用方据状态码即可判定
    expect(res.status).toBe(403);
    expect(userByName('operator')!.role).toBe('operator');
  });

  it('即使同时拥有 role.assign 也不能修改自己的角色（自我提升的直接路径）', () => {
    const session = loginWithCustomPermissions(['system.user.view', 'system.user.update', 'system.user.role.assign']);
    const self = userByName('guest')!;
    const res = call('PUT', `/api/v1/users/${self.id}`, { token: session.token, body: { role: 'admin' } });
    expect(res.status).toBe(403);
    expect(userByName('guest')!.role).toBe('viewer');
    // 再试一个「可分配」的角色也一样被拒——自我变更这条路径整体关闭
    const reassign = call('PUT', `/api/v1/users/${self.id}`, { token: session.token, body: { role: 'operator' } });
    expect(reassign.status).toBe(403);
    expect(userByName('guest')!.role).toBe('viewer');
  });

  it('管理员改自己的角色同样被拒（没有例外路径）', () => {
    const admin = loginAs('admin');
    const self = userByName('admin')!;
    const res = call('PUT', `/api/v1/users/${self.id}`, { token: admin.token, body: { role: 'viewer' } });
    expect(res.status).toBe(403);
    expect(userByName('admin')!.role).toBe('admin');
  });

  it('拥有 role.assign 时也只能指派允许范围内的角色', () => {
    const admin = loginAs('admin');
    const target = userByName('operator')!;
    for (const role of ASSIGNABLE_ROLE_KEYS) {
      const res = call('PUT', `/api/v1/users/${target.id}`, { token: admin.token, body: { role } });
      expect(res.status, `指派 ${role} 应当成功`).toBe(200);
      expect(userByName('operator')!.role).toBe(role);
    }
    // admin / lead 不在可分配范围：即使当前角色是允许值，提权请求也不得生效
    for (const role of ['admin', 'lead'] as const) {
      const before = userByName('operator')!.role;
      const res = call('PUT', `/api/v1/users/${target.id}`, { token: admin.token, body: { role } });
      expect(res.status, `指派 ${role} 应当被拒`).toBe(403);
      expect(userByName('operator')!.role).toBe(before);
    }
  });

  it('未授权直接调用 API 返回 403（不依赖 UI 隐藏）', () => {
    const viewer = loginAs('guest');
    const target = userByName('operator')!;
    expect(call('PUT', `/api/v1/users/${target.id}`, { token: viewer.token, body: { name: 'x' } }).status).toBe(403);
    expect(call('PUT', `/api/v1/users/${target.id}`, { token: viewer.token, body: { role: 'admin' } }).status).toBe(
      403,
    );
    expect(call('PUT', `/api/v1/users/${target.id}`, { body: { role: 'admin' } }).status).toBe(401);
    expect(userByName('operator')!.name).not.toBe('x');
    expect(userByName('operator')!.role).toBe('operator');
  });

  it('admin 行为与角色矩阵文档一致：admin 持有全部权限且改角色被正确记录', () => {
    const admin = loginAs('admin');
    expect([...admin.user.permissions].sort()).toEqual([...PERMISSION_KEYS].sort());
    const target = userByName('operator')!;
    const res = call('PUT', `/api/v1/users/${target.id}`, { token: admin.token, body: { role: 'analyst' } });
    expect(res.status).toBe(200);
    expect(userByName('operator')!.role).toBe('analyst');
    expect(logsOf('userRoleAssign')).toHaveLength(1);
    expect(logsOf('userRoleAssign')[0]!.target).toContain('operator');
    expect(logsOf('userRoleAssign')[0]!.actorName).toBeTruthy();
  });

  it('用户角色创建时受可分配范围约束，不允许直接建成 admin', () => {
    const admin = loginAs('admin');
    const rejected = call('POST', '/api/v1/users', {
      token: admin.token,
      body: { name: '提权', username: 'escalate.user', email: 'e@example.com', role: 'admin' },
    });
    expect(rejected.status).toBe(403);
    const accepted = call('POST', '/api/v1/users', {
      token: admin.token,
      body: { name: '正常', username: 'normal.user', email: 'n@example.com', role: 'analyst' },
    });
    expect(accepted.status).toBe(200);
    expect(userByName('normal.user')!.role).toBe('analyst');
  });
});

// ------------------------------------------------ F2 导入请求预算

describe('F2 users/import 的请求预算与原子性', () => {
  const admin = () => loginAs('admin');
  const rowsOf = (count: number, make: (i: number) => Record<string, unknown>) =>
    Array.from({ length: count }, (_, i) => make(i + 1));

  const validRow = (i: number) => ({
    name: `批量用户${i}`,
    username: `bulk.user${i}`,
    email: `bulk.user${i}@example.com`,
  });

  it('数据行数超过 1000 行上限时被拒且不落库', () => {
    const token = admin().token;
    const rows = rowsOf(USER_IMPORT_LIMITS.maxRows + 1, validRow);
    const res = call('POST', '/api/v1/users/import', { token, body: { rows } });
    expect(res.status).toBe(413);
    expect(data().users.some((u) => u.username === 'bulk.user1')).toBe(false);
  });

  it('单字段超长时被拒且不落库（含前面已合法的行）', () => {
    const token = admin().token;
    const rows = [validRow(1), { ...validRow(2), name: 'x'.repeat(USER_IMPORT_LIMITS.maxFieldLength + 1) }];
    const res = call('POST', '/api/v1/users/import', { token, body: { rows } });
    expect(res.status).toBe(413);
    expect(data().users.some((u) => u.username === 'bulk.user1')).toBe(false);
  });

  it('聚合文本预算超限时被拒且不落库', () => {
    const token = admin().token;
    // 每行本身合法（每个字段都 < 256 字符），但整批文本量超出 totalText 预算。
    // 用 ASCII 计算长度，避免把「字符数」和「字节数」两种口径混在一起。
    const perField = USER_IMPORT_LIMITS.maxFieldLength - 2;
    const perRow = perField * 3;
    const rowCount = Math.ceil(USER_IMPORT_LIMITS.maxTotalTextLength / perRow) + 2;
    expect(rowCount).toBeLessThanOrEqual(USER_IMPORT_LIMITS.maxRows);
    const rows = rowsOf(rowCount, (i) => ({
      name: `n${i}`.padEnd(perField, 'a'),
      username: `u${i}`.padEnd(perField, 'b'),
      email: `e${i}`.padEnd(perField, 'c'),
    }));
    const total = rows.reduce(
      (sum, row) => sum + Object.values(row).reduce<number>((n, value) => n + String(value).length, 0),
      0,
    );
    expect(total).toBeGreaterThan(USER_IMPORT_LIMITS.maxTotalTextLength);
    const res = call('POST', '/api/v1/users/import', { token, body: { rows } });
    expect(res.status).toBe(413);
    expect(data().users.some((u) => u.username === 'bulk.user1')).toBe(false);
  });

  it('row 不是 object（字符串 / 数组 / null）一律判请求非法', () => {
    const token = admin().token;
    for (const row of ['not-an-object', ['a'], null, 42]) {
      const res = call('POST', '/api/v1/users/import', { token, body: { rows: [row] } });
      expect(res.status, `row=${JSON.stringify(row)} 应被拒`).toBe(400);
    }
  });

  it('字符串字段传入数组或嵌套对象一律判请求非法', () => {
    const token = admin().token;
    for (const value of [['a', 'b'], { nested: true }, 123, true]) {
      const res = call('POST', '/api/v1/users/import', {
        token,
        body: { rows: [{ ...validRow(1), name: value }] },
      });
      expect(res.status, `name=${JSON.stringify(value)} 应被拒`).toBe(400);
    }
    expect(data().users.some((u) => u.username === 'bulk.user1')).toBe(false);
  });

  it('未知字段一律判请求非法（不允许把任意结构写进用户记录）', () => {
    const token = admin().token;
    const res = call('POST', '/api/v1/users/import', {
      token,
      body: { rows: [{ ...validRow(1), __proto__admin: 'x', isAdmin: true }] },
    });
    expect(res.status).toBe(400);
    expect(data().users.some((u) => u.username === 'bulk.user1')).toBe(false);
  });

  it('后续行 malformed 时前面的行不能已经提交（无部分写入）', () => {
    const token = admin().token;
    const usersBefore = data().users.length;
    const rows = [validRow(1), validRow(2), 'malformed-row', validRow(4)];
    const res = call('POST', '/api/v1/users/import', { token, body: { rows } });
    expect(res.status).toBe(400);
    expect(data().users.length).toBe(usersBefore);
    expect(data().users.some((u) => u.username === 'bulk.user1')).toBe(false);
    expect(logsOf('userImport')).toHaveLength(0);
  });

  it('rows 不是数组 / 缺失时判请求非法，不产生写入', () => {
    const token = admin().token;
    for (const body of [{ rows: 'x' }, { rows: { 0: validRow(1) } }, {}, { rows: null }]) {
      const res = call('POST', '/api/v1/users/import', { token, body });
      expect(res.status).toBe(400);
    }
    expect(data().users.some((u) => u.username === 'bulk.user1')).toBe(false);
  });

  it('未授权用户调用导入返回 403', () => {
    const viewer = loginAs('guest');
    const res = call('POST', '/api/v1/users/import', { token: viewer.token, body: { rows: [validRow(1)] } });
    expect(res.status).toBe(403);
    expect(call('POST', '/api/v1/users/import', { body: { rows: [validRow(1)] } }).status).toBe(401);
  });

  it('正常 valid / duplicate / invalid 语义不回归', () => {
    const token = admin().token;
    const rows = [
      validRow(1),
      { ...validRow(2), email: 'bad-email' },
      validRow(1),
      { name: '缺邮箱也算合法', username: 'bulk.noemail' },
    ];
    const res = call('POST', '/api/v1/users/import', { token, body: { rows } });
    expect(res.status).toBe(200);
    const result = res.body.data as UserImportResult;
    expect(result.created).toBe(2);
    expect(result.invalid).toBe(1);
    expect(result.duplicated).toBe(1);
    expect(result.createdIds).toHaveLength(2);
    // 结构合法的请求仍要写一条导入日志
    expect(logsOf('userImport')).toHaveLength(1);
  });

  it('导入不接受把它变成提权通道的角色值', () => {
    const token = admin().token;
    const res = call('POST', '/api/v1/users/import', {
      token,
      body: { rows: [{ ...validRow(1), role: 'admin' }] },
    });
    expect(res.status).toBe(200);
    const result = res.body.data as UserImportResult;
    expect(result.created).toBe(0);
    expect(result.invalid).toBe(1);
    // 可分配范围内的角色仍可导入
    const allowed = call('POST', '/api/v1/users/import', {
      token,
      body: { rows: [{ ...validRow(2), role: 'operator' }] },
    });
    expect((allowed.body.data as UserImportResult).created).toBe(1);
    expect(userByName('bulk.user2')!.role).toBe('operator');
    expect(data().users.some((u) => u.username === 'bulk.user1')).toBe(false);
  });

  it('导入不能绕过 role.assign：带 role 的行同样要求独立权限', () => {
    // 定制角色：有 system.user.create（导入所需）但没有 system.user.role.assign
    server.store.update('roles', 'viewer', {
      permissions: ['system.user.view', 'system.user.create'],
      updatedAt: NOW.toISOString(),
    });
    const session = loginAs('guest');
    expect(session.user.permissions).toContain('system.user.create');
    expect(session.user.permissions).not.toContain('system.user.role.assign');

    // 带 role 的导入整批 403，且不产生任何写入
    const withRole = call('POST', '/api/v1/users/import', {
      token: session.token,
      body: { rows: [{ ...validRow(1), role: 'operator' }] },
    });
    expect(withRole.status).toBe(403);
    expect(data().users.some((u) => u.username === 'bulk.user1')).toBe(false);
    expect(logsOf('userImport')).toHaveLength(0);

    // 不带 role 的导入仍然可用（新权限只拦角色写入，不拦正常导入）
    const withoutRole = call('POST', '/api/v1/users/import', {
      token: session.token,
      body: { rows: [validRow(2)] },
    });
    expect(withoutRole.status).toBe(200);
    expect((withoutRole.body.data as UserImportResult).created).toBe(1);
    expect(userByName('bulk.user2')!.role).toBe('viewer');
  });
});

// ------------------------------------------------ F7 特权 mutation 审计

describe('F7 日程 / 角色 reset / 演示时钟写操作日志', () => {
  it('日程创建、更新、删除各写一条日志，含 actor / target / result / time', () => {
    const lead = loginAs('lead');
    const created = call('POST', '/api/v1/events', {
      token: lead.token,
      body: { title: '季度演练', type: 'training', start: '2026-10-20T02:00:00.000Z' },
    });
    expect(created.status).toBe(200);
    const event = created.body.data as { id: string };
    expect(logsOf('scheduleCreate')).toHaveLength(1);
    expect(logsOf('scheduleCreate')[0]).toMatchObject({
      actorName: expect.any(String),
      target: event.id,
      result: 'success',
      createdAt: expect.any(String),
    });
    expect(logsOf('scheduleCreate')[0]!.actorName).toBeTruthy();

    expect(call('PUT', `/api/v1/events/${event.id}`, { token: lead.token, body: { title: '改期演练' } }).status).toBe(
      200,
    );
    expect(logsOf('scheduleUpdate')).toHaveLength(1);
    expect(logsOf('scheduleUpdate')[0]!.target).toBe(event.id);

    expect(call('DELETE', `/api/v1/events/${event.id}`, { token: lead.token }).status).toBe(200);
    expect(logsOf('scheduleDelete')).toHaveLength(1);
    expect(logsOf('scheduleDelete')[0]!.target).toBe(event.id);
  });

  it('目标不存在时不伪造成功日志', () => {
    const lead = loginAs('lead');
    const before = logs().length;
    expect(call('PUT', '/api/v1/events/EV-NOPE', { token: lead.token, body: { title: 'x' } }).status).toBe(404);
    expect(call('DELETE', '/api/v1/events/EV-NOPE', { token: lead.token }).status).toBe(404);
    expect(logsOf('scheduleUpdate')).toHaveLength(0);
    expect(logsOf('scheduleDelete')).toHaveLength(0);
    expect(logs().length).toBe(before);
  });

  it('未授权用户既不能 mutation，也不产生误导性日志', () => {
    const viewer = loginAs('guest');
    const before = logs().length;
    expect(
      call('POST', '/api/v1/events', { token: viewer.token, body: { title: 'x', start: '2026-10-20T00:00:00Z' } })
        .status,
    ).toBe(403);
    expect(logs().length).toBe(before);
    expect(logsOf('scheduleCreate')).toHaveLength(0);
  });

  it('角色 reset 写日志且权限恢复默认', () => {
    const admin = loginAs('admin');
    server.store.update('roles', 'analyst', { permissions: ['dashboard.view'], updatedAt: NOW.toISOString() });
    expect(roleById('analyst')!.permissions).toEqual(['dashboard.view']);
    expect(call('POST', '/api/v1/roles/analyst/reset', { token: admin.token }).status).toBe(200);
    expect([...roleById('analyst')!.permissions].sort()).toEqual([...DEFAULT_ROLE_PERMISSIONS.analyst].sort());
    expect(logsOf('roleReset')).toHaveLength(1);
    expect(logsOf('roleReset')[0]!.target).toBeTruthy();
  });

  it('角色 reset 目标不存在时不写日志', () => {
    const admin = loginAs('admin');
    expect(call('POST', '/api/v1/roles/nope/reset', { token: admin.token }).status).toBe(404);
    expect(logsOf('roleReset')).toHaveLength(0);
  });

  it('演示时钟变更写日志；未授权写不了也留不下日志', () => {
    const admin = loginAs('admin');
    expect(call('POST', '/api/v1/demo/clock', { token: admin.token, body: { mode: 'frozen' } }).status).toBe(200);
    expect(logsOf('demoClock')).toHaveLength(1);
    expect(logsOf('demoClock')[0]).toMatchObject({ target: 'frozen', result: 'success' });

    const viewer = loginAs('guest');
    const before = logsOf('demoClock').length;
    expect(call('POST', '/api/v1/demo/clock', { token: viewer.token, body: { mode: 'live' } }).status).toBe(403);
    expect(logsOf('demoClock')).toHaveLength(before);
  });

  it('demo reset / scenario 语义保持兼容（不累积补丁，也不放大日志）', () => {
    const admin = loginAs('admin');
    // 先制造一个补丁：改过名字的用户在重置后必须回到生成基线
    const target = userByName('operator')!;
    call('PUT', `/api/v1/users/${target.id}`, { token: admin.token, body: { name: '被改过的名字' } });
    expect(userByName('operator')!.name).toBe('被改过的名字');
    // 基线 = 登录日志进入之后、任何 mutation 之前的稳定值
    const baselineLogs = data().logs.length;
    expect(call('POST', '/api/v1/demo/scenario', { token: admin.token, body: { action: 'enter' } }).status).toBe(200);
    expect(call('POST', '/api/v1/demo/reset', { token: admin.token }).status).toBe(200);
    // 重置清空补丁：被改过的名字回到生成值，用户数回到基线，日志不随重置累积
    expect(userByName('operator')!.name).not.toBe('被改过的名字');
    expect(data().logs.length).toBeLessThanOrEqual(baselineLogs);
    expect(roleById('admin')!.permissions.length).toBe(PERMISSION_KEYS.length);
  });
});

// ------------------------------------------------ F8 角色权限集合等价

describe('F8 admin 角色锁按集合等价判定，重复 key 不能绕过', () => {
  const admin = () => loginAs('admin');

  it('重复合法 key 填满长度时更新 admin 失败', () => {
    const token = admin().token;
    const duplicated = [...PERMISSION_KEYS, ...PERMISSION_KEYS];
    const res = call('PUT', '/api/v1/roles/admin', { token, body: { permissions: duplicated } });
    expect(res.status).toBe(400);
    expect([...roleById('admin')!.permissions].sort()).toEqual([...PERMISSION_KEYS].sort());
  });

  it('缺少 key 时更新 admin 失败', () => {
    const token = admin().token;
    const missing = PERMISSION_KEYS.slice(1);
    expect(call('PUT', '/api/v1/roles/admin', { token, body: { permissions: missing } }).status).toBe(403);
    expect([...roleById('admin')!.permissions].sort()).toEqual([...PERMISSION_KEYS].sort());
  });

  it('重复 key 顶替缺失 key 时失败（长度相等的伪造全量）', () => {
    const token = admin().token;
    // 长度与 PERMISSION_KEYS 相同，但第 0 个 key 缺失、第 1 个 key 出现两次：
    // 只比长度会放行，集合等价会拒
    const forged = [...PERMISSION_KEYS.slice(1), PERMISSION_KEYS[1]!];
    expect(forged).toHaveLength(PERMISSION_KEYS.length);
    expect(new Set(forged).size).toBe(PERMISSION_KEYS.length - 1);
    expect(new Set(forged).has(PERMISSION_KEYS[0]!)).toBe(false);
    expect(call('PUT', '/api/v1/roles/admin', { token, body: { permissions: forged } }).status).toBe(400);
    expect([...roleById('admin')!.permissions].sort()).toEqual([...PERMISSION_KEYS].sort());
  });

  it('顺序不同的完整集合被接受（集合等价而非数组相等）', () => {
    const token = admin().token;
    const shuffled = [...PERMISSION_KEYS].reverse();
    const res = call('PUT', '/api/v1/roles/admin', { token, body: { permissions: shuffled } });
    expect(res.status).toBe(200);
    expect([...roleById('admin')!.permissions].sort()).toEqual([...PERMISSION_KEYS].sort());
  });

  it('未知 key 失败（admin 与非 admin 都一样）', () => {
    const token = admin().token;
    expect(
      call('PUT', '/api/v1/roles/admin', {
        token,
        body: { permissions: [...PERMISSION_KEYS, 'system.user.superuser'] },
      }).status,
    ).toBe(400);
    expect(
      call('PUT', '/api/v1/roles/viewer', {
        token,
        body: { permissions: ['dashboard.view', 'made.up.key'] },
      }).status,
    ).toBe(400);
    expect(roleById('viewer')!.permissions).toEqual(DEFAULT_ROLE_PERMISSIONS.viewer);
  });

  it('非 string 元素与 group / 非叶子 key 失败', () => {
    const token = admin().token;
    const bad: unknown[] = [
      [...PERMISSION_KEYS, 42],
      [...PERMISSION_KEYS, null],
      ['system', 'dashboard'],
      'dashboard.view',
    ];
    for (const permissions of bad) {
      expect(
        call('PUT', '/api/v1/roles/admin', { token, body: { permissions } }).status,
        `permissions=${JSON.stringify(permissions)} 应被拒`,
      ).toBe(400);
    }
  });

  it('正常 role 更新成功，且持久化的列表无重复项', () => {
    const token = admin().token;
    const res = call('PUT', '/api/v1/roles/analyst', {
      token,
      body: { permissions: ['dashboard.view', 'ops.device.view', 'doc.export'] },
    });
    expect(res.status).toBe(200);
    expect([...roleById('analyst')!.permissions].sort()).toEqual(['dashboard.view', 'doc.export', 'ops.device.view']);
    expect(new Set(roleById('analyst')!.permissions).size).toBe(roleById('analyst')!.permissions.length);

    // 重复 key 属于非法输入 → 400，且不会静默去重后落库
    const duplicated = call('PUT', '/api/v1/roles/analyst', {
      token,
      body: { permissions: ['dashboard.view', 'ops.device.view', 'ops.device.view'] },
    });
    expect(duplicated.status).toBe(400);
    expect([...roleById('analyst')!.permissions].sort()).toEqual(['dashboard.view', 'doc.export', 'ops.device.view']);
  });
});

// ------------------------------------------------ F11 验收签名强校验

/** 生成一个结构合法的最小 PNG（可选尺寸 / 截断 / CRC 破坏），避免把二进制字面量写进仓库 */
const pngDataUrl = (options: { width?: number; height?: number; truncate?: number; breakCrc?: boolean } = {}) => {
  const { width = 8, height = 8, truncate = 0, breakCrc = false } = options;
  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();
  const crc32 = (bytes: number[]) => {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const bytes: number[] = [137, 80, 78, 71, 13, 10, 26, 10];
  const chunk = (type: string, payload: number[]) => {
    const typeBytes = [...type].map((char) => char.charCodeAt(0));
    const length = payload.length;
    const body = [...typeBytes, ...payload];
    const crc = crc32(body) ^ (breakCrc ? 1 : 0);
    bytes.push((length >>> 24) & 0xff, (length >>> 16) & 0xff, (length >>> 8) & 0xff, length & 0xff);
    bytes.push(...body);
    bytes.push((crc >>> 24) & 0xff, (crc >>> 16) & 0xff, (crc >>> 8) & 0xff, crc & 0xff);
  };
  chunk('IHDR', [
    (width >>> 24) & 0xff,
    (width >>> 16) & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    (height >>> 24) & 0xff,
    (height >>> 16) & 0xff,
    (height >>> 8) & 0xff,
    height & 0xff,
    8,
    6,
    0,
    0,
    0,
  ]);
  // 真实的 zlib IDAT：height 行 ×（1 字节过滤类型 + width×4 字节 RGBA），校验器要求解压字节数与 IHDR 一致
  chunk('IDAT', [...deflateSync(Buffer.alloc(height * (1 + width * 4)))]);
  chunk('IEND', []);
  const sliced = truncate > 0 ? bytes.slice(0, Math.max(9, bytes.length - truncate)) : bytes;
  return `data:image/png;base64,${btoa(String.fromCharCode(...sliced))}`;
};

describe('F11 验收签名必须通过强校验才改变工单状态', () => {
  /** 造一张 done 工单：走真实流程（告警 → 转工单 → 完成） */
  const doneTicketId = (token: string) => {
    const alarm = data().alarms.find((a) => a.status === 'active')!;
    call('POST', `/api/v1/alarms/${alarm.id}/handle`, { token, body: { action: 'ticket' } });
    const ticket = data().tickets.find((t) => t.alarmId === alarm.id)!;
    call('PUT', `/api/v1/tickets/${ticket.id}`, { token, body: { status: 'done' } });
    return ticket.id;
  };

  const malformed = () => {
    const prefix = 'data:image/png;base64,';
    return {
      prefixOnly: `${prefix}AAAA`,
      invalidBase64: `${prefix}${'!'.repeat(64)}`,
      notPng: `${prefix}${btoa('this is definitely not a png payload at all, just text')}`,
      tooWide: pngDataUrl({ width: 5000, height: 10 }),
      tooManyPixels: pngDataUrl({ width: 3000, height: 3000 }),
      truncated: pngDataUrl({ truncate: 6 }),
      brokenCrc: pngDataUrl({ breakCrc: true }),
      oversize: `${prefix}${'A'.repeat(4 * 1024 * 1024)}`,
      wrongType: 123 as unknown as string,
    };
  };

  it('各类畸形签名一律被拒，且工单状态不变', () => {
    const lead = loginAs('lead');
    const id = doneTicketId(lead.token);
    const before = data().tickets.find((t) => t.id === id)!.acceptance;
    expect(before).toBeUndefined();
    for (const [label, signature] of Object.entries(malformed())) {
      const res = call('POST', `/api/v1/tickets/${id}/acceptance`, { token: lead.token, body: { signature } });
      expect(res.status, `${label} 应被拒`).toBe(200);
      expect(res.body.success, `${label} 不应成功`).toBe(false);
      expect(data().tickets.find((t) => t.id === id)!.acceptance, `${label} 不应改变状态`).toBeUndefined();
    }
    expect(logsOf('ticketAccept')).toHaveLength(0);
  });

  it('合法 PNG 通过并写入验收', () => {
    const lead = loginAs('lead');
    const id = doneTicketId(lead.token);
    const signature = pngDataUrl({ width: 220, height: 110 });
    const res = call('POST', `/api/v1/tickets/${id}/acceptance`, { token: lead.token, body: { signature } });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(data().tickets.find((t) => t.id === id)!.acceptance?.signature).toBe(signature);
    expect(logsOf('ticketAccept')).toHaveLength(1);
  });

  it('未授权用户验收返回 403 且状态不变', () => {
    const lead = loginAs('lead');
    const id = doneTicketId(lead.token);
    const viewer = loginAs('guest');
    const res = call('POST', `/api/v1/tickets/${id}/acceptance`, {
      token: viewer.token,
      body: { signature: pngDataUrl() },
    });
    expect(res.status).toBe(403);
    expect(data().tickets.find((t) => t.id === id)!.acceptance).toBeUndefined();
  });
});

// ------------------------------------------------ F12 设备坐标数据范围

describe('F12 精确设备坐标由 API 按权限决定', () => {
  const devicePage = (token: string) =>
    call('GET', '/api/v1/devices', { token, params: { pageSize: 200 } }).body.data as {
      list: Device[];
    };
  const rawDevice = (id: string) => data().devices.find((d) => d.id === id)!;

  it('viewer 拿不到精确坐标，只能拿到粗化值', () => {
    const viewer = loginAs('guest');
    const list = devicePage(viewer.token).list;
    expect(list.length).toBeGreaterThan(0);
    let sawMaskedValue = false;
    for (const device of list) {
      expect(device.coordinatePrecision).toBe('coarse');
      const exact = rawDevice(device.id);
      // 粗化到 0.1° 格网：必须在格网上，且与原值偏差不超一格
      expect(device.lng).toBe(Number(device.lng.toFixed(1)));
      expect(device.lat).toBe(Number(device.lat.toFixed(1)));
      expect(Math.abs(device.lng - exact.lng)).toBeLessThanOrEqual(0.1);
      expect(Math.abs(device.lat - exact.lat)).toBeLessThanOrEqual(0.1);
      // 不允许保留一位小数以上的精度（否则精确值仍可从响应复原）
      expect(device.lng.toFixed(4)).toBe(Number(device.lng.toFixed(1)).toFixed(4));
      expect(device.lat.toFixed(4)).toBe(Number(device.lat.toFixed(1)).toFixed(4));
      if (device.lng !== exact.lng || device.lat !== exact.lat) sawMaskedValue = true;
    }
    // 至少有一个设备确实被粗化（否则这条断言等于什么都没验证）
    expect(sawMaskedValue).toBe(true);
  });

  it('admin 可以获得精确坐标', () => {
    const admin = loginAs('admin');
    const list = devicePage(admin.token).list;
    expect(list.every((d) => d.coordinatePrecision === 'exact')).toBe(true);
    expect(list.find((d) => d.id === rawDevice(list[0]!.id).id)!.lng).toBe(rawDevice(list[0]!.id).lng);
  });

  it('operator 持有 coordinate.view 时拿到精确坐标，analyst 不持有则拿到粗化值', () => {
    const operator = loginAs('operator');
    const analyst = loginAs('analyst');
    expect(devicePage(operator.token).list.every((d) => d.coordinatePrecision === 'exact')).toBe(true);
    expect(devicePage(analyst.token).list.every((d) => d.coordinatePrecision === 'coarse')).toBe(true);
  });

  it('直接调用 API 不能绕过 UI 脱敏：all / 详情 / 单设备三条路径一致', () => {
    const viewer = loginAs('guest');
    const all = call('GET', '/api/v1/devices/all', { token: viewer.token }).body.data as Device[];
    expect(all.every((d) => d.coordinatePrecision === 'coarse')).toBe(true);
    const id = all[0]!.id;
    const detail = call('GET', `/api/v1/devices/${id}`, { token: viewer.token }).body.data as Device;
    expect(detail.coordinatePrecision).toBe('coarse');
    expect(detail.lng).toBe(all.find((d) => d.id === id)!.lng);
    expect(detail.lng).not.toBe(rawDevice(id).lng);
  });

  it('未登录访问设备接口返回 401', () => {
    expect(call('GET', '/api/v1/devices').status).toBe(401);
  });

  it('粗化坐标仍可用于地图渲染（有限、非空、在合法经纬度范围内）', () => {
    const viewer = loginAs('guest');
    for (const device of devicePage(viewer.token).list) {
      for (const value of [device.lng, device.lat]) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(-180);
        expect(value).toBeLessThanOrEqual(180);
      }
    }
  });
});

// ------------------------------------------------ 存储隔离

describe('安全回归不污染演示存储', () => {
  it('补丁只写入本次内存存储的版本化键', () => {
    const admin = loginAs('admin');
    call('PUT', `/api/v1/users/${userByName('operator')!.id}`, { token: admin.token, body: { role: 'viewer' } });
    expect([...storage.data.keys()].every((key) => key === STORE_KEY)).toBe(true);
  });
});

// ------------------------------------------------ 审计日志 action 口径

describe('审计日志 action 与操作语义对齐（N7）', () => {
  it('单条删除与批量删除都记 userDelete，可与编辑区分开', () => {
    const admin = loginAs('admin');
    // 体验账号（admin/guest/lead/operator/analyst）是受保护账号，不能删；用新建用户验证
    const makeUser = (name: string, username: string) =>
      call('POST', '/api/v1/users', {
        token: admin.token,
        body: { name, username, email: `${username}@example.com` },
      }).body.data as { id: string };
    const single = makeUser('单个待删', 'single.doomed');
    const created = makeUser('待批量删除', 'batch.doomed');
    const created2 = makeUser('待批量删除二', 'batch.doomed2');

    expect(call('DELETE', `/api/v1/users/${single.id}`, { token: admin.token }).status).toBe(200);
    expect(logsOf('userDelete').map((log) => log.target)).toContain('单个待删');

    const before = logsOf('userDelete').length;
    expect(
      call('POST', '/api/v1/users/batch', {
        token: admin.token,
        body: { ids: [created.id, created2.id], action: 'delete' },
      }).status,
    ).toBe(200);
    const after = logsOf('userDelete');
    expect(after.length).toBe(before + 2);
    expect(after.map((log) => log.target)).toEqual(expect.arrayContaining(['待批量删除', '待批量删除二']));
    // 批量删除不得落成 userUpdate，否则按 userDelete 过滤会漏
    expect(logsOf('userUpdate').some((log) => log.target === '待批量删除')).toBe(false);
  });

  it('批量停用记 userDisable、批量启用记 userUpdate', () => {
    const admin = loginAs('admin');
    const a = call('POST', '/api/v1/users', {
      token: admin.token,
      body: { name: '批量甲', username: 'batch.a', email: 'batch.a@example.com' },
    }).body.data as { id: string };
    const b = call('POST', '/api/v1/users', {
      token: admin.token,
      body: { name: '批量乙', username: 'batch.b', email: 'batch.b@example.com' },
    }).body.data as { id: string };

    call('POST', '/api/v1/users/batch', { token: admin.token, body: { ids: [a.id, b.id], action: 'disable' } });
    expect(logsOf('userDisable').map((log) => log.target)).toEqual(expect.arrayContaining(['批量甲', '批量乙']));

    const beforeEnable = logsOf('userUpdate').length;
    call('POST', '/api/v1/users/batch', { token: admin.token, body: { ids: [a.id, b.id], action: 'enable' } });
    expect(logsOf('userUpdate').length).toBe(beforeEnable + 2);
  });
});

// ------------------------------------------------ 2026-10-15 只读审查复现的残留

describe('角色权限编辑不能成为自我提权的同类路径', () => {
  /** 定制角色：viewer 记录被授予角色管理权限，guest 是该角色的体验账号 */
  const roleEditor = () => loginWithCustomPermissions(['dashboard.view', 'system.role.view', 'system.role.update']);

  it('持有 system.role.update 的定制角色不能改写自己所在角色的权限', () => {
    const session = roleEditor();
    const before = [...roleById('viewer')!.permissions];
    // 种子日志里本来就有 roleUpdate：断言「没有新增」而不是「为零」
    const logsBefore = logsOf('roleUpdate').length;
    const res = call('PUT', '/api/v1/roles/viewer', {
      token: session.token,
      body: { permissions: [...PERMISSION_KEYS] },
    });
    expect(res.status).toBe(403);
    expect(roleById('viewer')!.permissions).toEqual(before);
    // 已有会话逐请求解析：拒绝后会话权限也不能变大
    const me = call('GET', '/api/v1/currentUser', { token: session.token }).body.data as { permissions: string[] };
    expect([...me.permissions].sort()).toEqual([...before].sort());
    expect(logsOf('roleUpdate')).toHaveLength(logsBefore);
  });

  it('也不能 reset 自己所在的角色（默认值可能比管理员收紧后的更大）', () => {
    server.store.update('roles', 'lead', {
      permissions: ['dashboard.view', 'system.role.view', 'system.role.update'],
      updatedAt: NOW.toISOString(),
    });
    const lead = loginAs('lead');
    const res = call('POST', '/api/v1/roles/lead/reset', { token: lead.token });
    expect(res.status).toBe(403);
    expect([...roleById('lead')!.permissions].sort()).toEqual([
      'dashboard.view',
      'system.role.update',
      'system.role.view',
    ]);
    expect(logsOf('roleReset')).toHaveLength(0);
  });

  it('只能授予自己持有的权限点：给其他角色加自己没有的权限被拒', () => {
    const session = roleEditor();
    const before = [...roleById('analyst')!.permissions];
    const escalate = call('PUT', '/api/v1/roles/analyst', {
      token: session.token,
      body: { permissions: [...before, 'system.user.role.assign'] },
    });
    expect(escalate.status).toBe(403);
    expect(roleById('analyst')!.permissions).toEqual(before);
    // reset 等价于一次授予：默认值里有调用者不持有的权限时同样被拒
    server.store.update('roles', 'analyst', { permissions: ['dashboard.view'], updatedAt: NOW.toISOString() });
    expect(call('POST', '/api/v1/roles/analyst/reset', { token: session.token }).status).toBe(403);
    expect(roleById('analyst')!.permissions).toEqual(['dashboard.view']);
  });

  it('授予自己持有的权限、或收回自己没有的权限仍然可以', () => {
    const session = roleEditor();
    // analyst 默认持有 doc.export 等调用者没有的权限：收回不是授予
    const kept = roleById('analyst')!.permissions.filter((key) => key !== 'doc.export');
    const shrink = call('PUT', '/api/v1/roles/analyst', { token: session.token, body: { permissions: kept } });
    expect(shrink.status).toBe(200);
    expect(roleById('analyst')!.permissions).not.toContain('doc.export');
    // 原本就有、调用者没有的权限保留不动也不算授予
    const grow = call('PUT', '/api/v1/roles/analyst', {
      token: session.token,
      body: { permissions: [...kept, 'system.role.view'] },
    });
    expect(grow.status).toBe(200);
    expect(roleById('analyst')!.permissions).toContain('system.role.view');
  });

  it('admin 不受授予上限影响（持有全部权限），admin 角色仍按集合锁定', () => {
    const admin = loginAs('admin');
    expect(
      call('PUT', '/api/v1/roles/viewer', {
        token: admin.token,
        body: { permissions: ['dashboard.view', 'system.user.role.assign'] },
      }).status,
    ).toBe(200);
    expect(
      call('PUT', '/api/v1/roles/admin', { token: admin.token, body: { permissions: PERMISSION_KEYS } }).status,
    ).toBe(200);
  });
});

describe('角色分配不能作用于 admin / lead 账号（与表单只读一致）', () => {
  const delegate = () =>
    loginWithCustomPermissions(['system.user.view', 'system.user.update', 'system.user.role.assign']);

  it('委派分配者不能把 admin / lead 账号降级', () => {
    const session = delegate();
    for (const username of ['admin', 'lead']) {
      const target = userByName(username)!;
      const before = target.role;
      const res = call('PUT', `/api/v1/users/${target.id}`, { token: session.token, body: { role: 'viewer' } });
      expect(res.status, `${username} 不应被降级`).toBe(403);
      expect(userByName(username)!.role).toBe(before);
    }
    expect(logsOf('userRoleAssign')).toHaveLength(0);
  });

  it('非体验账号的 admin / lead 同样受保护，管理员本人也不能经此通道改它们', () => {
    const admin = loginAs('admin');
    const otherLead = data().users.find((u) => u.role === 'lead' && u.username !== 'lead')!;
    expect(otherLead).toBeDefined();
    const res = call('PUT', `/api/v1/users/${otherLead.id}`, { token: admin.token, body: { role: 'operator' } });
    expect(res.status).toBe(403);
    expect(data().users.find((u) => u.id === otherLead.id)!.role).toBe('lead');
  });

  it('可分配范围内的账号之间仍可正常改派', () => {
    const session = delegate();
    const target = userByName('operator')!;
    const res = call('PUT', `/api/v1/users/${target.id}`, { token: session.token, body: { role: 'analyst' } });
    expect(res.status).toBe(200);
    expect(userByName('operator')!.role).toBe('analyst');
  });
});

describe('导入的角色列语义：空值即默认角色，非空才是一次角色分配', () => {
  const creatorWithoutAssign = () => {
    server.store.update('roles', 'viewer', {
      permissions: ['system.user.view', 'system.user.create'],
      updatedAt: NOW.toISOString(),
    });
    return loginAs('guest');
  };
  const row = (i: number, extra: Record<string, unknown> = {}) => ({
    row: i + 1,
    name: `导入${i}`,
    username: `role.col${i}`,
    email: `role.col${i}@example.com`,
    department: 'support',
    ...extra,
  });

  it('角色列为空字符串 / 纯空白时按默认角色导入，不需要 role.assign', () => {
    const session = creatorWithoutAssign();
    const res = call('POST', '/api/v1/users/import', {
      token: session.token,
      body: { rows: [row(1, { role: '' }), row(2, { role: '   ' })] },
    });
    expect(res.status).toBe(200);
    expect((res.body.data as UserImportResult).created).toBe(2);
    expect(userByName('role.col1')!.role).toBe('viewer');
    expect(userByName('role.col2')!.role).toBe('viewer');
  });

  it('非空角色仍需要 role.assign（整批 403，不写入）', () => {
    const session = creatorWithoutAssign();
    const res = call('POST', '/api/v1/users/import', {
      token: session.token,
      body: { rows: [row(1), row(2, { role: 'viewer' })] },
    });
    expect(res.status).toBe(403);
    expect(userByName('role.col1')).toBeUndefined();
  });

  it('接口契约只认角色 key：界面标签由客户端映射，服务端判该行无效', () => {
    const admin = loginAs('admin');
    const res = call('POST', '/api/v1/users/import', {
      token: admin.token,
      body: { rows: [row(1, { role: '运维工程师' }), row(2, { role: 'operator' })] },
    });
    const result = res.body.data as UserImportResult;
    expect(result.invalid).toBe(1);
    expect(result.created).toBe(1);
    expect(userByName('role.col2')!.role).toBe('operator');
  });

  it('问题行按客户端提交的 Excel 行号报告（客户端只提交有效行时仍能对上）', () => {
    const admin = loginAs('admin');
    const res = call('POST', '/api/v1/users/import', {
      token: admin.token,
      body: {
        rows: [
          { ...row(1), row: 7, email: 'bad' },
          { ...row(2), row: 12, username: 'admin' },
        ],
      },
    });
    const result = res.body.data as UserImportResult;
    expect(result.issues.map((issue) => issue.row)).toEqual([7, 12]);
  });
});

describe('工单 todo ↔ doing 流转写操作日志', () => {
  const todoTicket = (token: string) => {
    const alarm = data().alarms.find((a) => a.status === 'active')!;
    call('POST', `/api/v1/alarms/${alarm.id}/handle`, { token, body: { action: 'ticket' } });
    return data().tickets.find((t) => t.alarmId === alarm.id)!;
  };

  it('开始处理（todo → doing）记 ticketStart，退回（doing → todo）记 ticketReturn', () => {
    const lead = loginAs('lead');
    const ticket = todoTicket(lead.token);
    expect(ticket.status).toBe('todo');

    expect(call('PUT', `/api/v1/tickets/${ticket.id}`, { token: lead.token, body: { status: 'doing' } }).status).toBe(
      200,
    );
    expect(logsOf('ticketStart')).toHaveLength(1);
    expect(logsOf('ticketStart')[0]).toMatchObject({ target: ticket.id, result: 'success' });
    expect(logsOf('ticketStart')[0]!.actorName).toBeTruthy();

    expect(call('PUT', `/api/v1/tickets/${ticket.id}`, { token: lead.token, body: { status: 'todo' } }).status).toBe(
      200,
    );
    expect(logsOf('ticketReturn')).toHaveLength(1);
    expect(logsOf('ticketReturn')[0]!.target).toBe(ticket.id);

    // 完成与返工各记一条（store.update 原地改记录：起点状态必须在写入前取快照，否则完成日志永远写不出来）
    call('PUT', `/api/v1/tickets/${ticket.id}`, { token: lead.token, body: { status: 'doing' } });
    expect(call('PUT', `/api/v1/tickets/${ticket.id}`, { token: lead.token, body: { status: 'done' } }).status).toBe(
      200,
    );
    expect(logsOf('ticketClose').filter((log) => log.target === ticket.id)).toHaveLength(1);
    expect(call('POST', `/api/v1/tickets/${ticket.id}/rework`, { token: lead.token }).status).toBe(200);
    expect(logsOf('ticketRework').filter((log) => log.target === ticket.id)).toHaveLength(1);
    expect(logsOf('ticketStart')).toHaveLength(2);
  });

  it('状态不变或被拒绝的请求不产生流转日志', () => {
    const lead = loginAs('lead');
    const ticket = todoTicket(lead.token);
    call('PUT', `/api/v1/tickets/${ticket.id}`, { token: lead.token, body: { status: 'todo' } });
    const operator = loginAs('operator');
    call('PUT', `/api/v1/tickets/${ticket.id}`, { token: operator.token, body: { status: 'doing' } });
    // operator 没有派工权限：退回被拒，不留日志
    expect(
      call('PUT', `/api/v1/tickets/${ticket.id}`, { token: operator.token, body: { status: 'todo' } }).status,
    ).toBe(403);
    expect(logsOf('ticketStart')).toHaveLength(1);
    expect(logsOf('ticketReturn')).toHaveLength(0);
  });
});

describe('当前登录账号不能改自己的登录名（会话按登录名解析）', () => {
  const selfEditor = () => {
    const admin = loginAs('admin');
    call('POST', '/api/v1/users', {
      token: admin.token,
      body: { name: '自助编辑', username: 'self.editor', email: 'self.editor@example.com' },
    });
    server.store.update('roles', 'viewer', {
      permissions: ['system.user.view', 'system.user.update'],
      updatedAt: NOW.toISOString(),
    });
    return loginAs('self.editor');
  };

  it('非体验账号改自己的登录名被拒且不落库，其他资料字段照常可改', () => {
    const session = selfEditor();
    const self = userByName('self.editor')!;
    const renamed = call('PUT', `/api/v1/users/${self.id}`, {
      token: session.token,
      body: { username: 'self.renamed' },
    });
    expect(renamed.body.success).toBe(false);
    expect(userByName('self.renamed')).toBeUndefined();
    expect(userByName('self.editor')).toBeDefined();
    // 会话不受影响
    expect(call('GET', '/api/v1/currentUser', { token: session.token }).status).toBe(200);

    const profile = call('PUT', `/api/v1/users/${self.id}`, { token: session.token, body: { name: '新名字' } });
    expect(profile.body.success).toBe(true);
    expect(userByName('self.editor')!.name).toBe('新名字');
    // 原样提交自己的登录名（表单整份回传）不算改名
    const same = call('PUT', `/api/v1/users/${self.id}`, {
      token: session.token,
      body: { username: 'self.editor', email: 'changed@example.com' },
    });
    expect(same.body.success).toBe(true);
  });

  it('管理员仍可给其他非体验账号改名', () => {
    const admin = loginAs('admin');
    const created = call('POST', '/api/v1/users', {
      token: admin.token,
      body: { name: '待改名', username: 'to.rename', email: 'to.rename@example.com' },
    }).body.data as { id: string };
    const res = call('PUT', `/api/v1/users/${created.id}`, { token: admin.token, body: { username: 'was.renamed' } });
    expect(res.body.success).toBe(true);
    expect(userByName('was.renamed')).toBeDefined();
  });
});

describe('admin / lead 账号只由管理员角色维护（停用 / 启用 / 删除 / 改资料）', () => {
  /** 委派的用户管理者：viewer 记录被授予用户编辑与删除权限（不含 role.assign），guest 是该角色的体验账号 */
  const delegate = () => loginWithCustomPermissions(['system.user.view', 'system.user.update', 'system.user.delete']);
  const byId = (id: string) => data().users.find((u) => u.id === id);
  /** 非体验账号的 lead：体验账号另有 PROTECTED_USERNAMES 兜底，这里要证明的是「按角色」而不是「按登录名」保护 */
  const otherLead = () =>
    data().users.find((u) => u.role === 'lead' && u.username !== 'lead' && u.status === 'active')!;
  /** 可分配范围内的非体验账号：委派管理者对它们的正常操作不能被一起挡掉 */
  const ordinary = (n = 1) =>
    data()
      .users.filter((u) => u.role === 'operator' && u.username !== 'operator' && u.status === 'active')
      .slice(0, n);
  const privilegedTargets = () => [userByName('admin')!, userByName('lead')!, otherLead()];

  it('委派角色单条 PUT 停用 / 启用 admin、lead 账号返回 403，状态不变', () => {
    const session = delegate();
    for (const target of privilegedTargets()) {
      const res = call('PUT', `/api/v1/users/${target.id}`, { token: session.token, body: { status: 'disabled' } });
      expect(res.status, `${target.username} 不应被停用`).toBe(403);
      expect(byId(target.id)!.status).toBe('active');
    }
    // 「启用」同样是状态变更：管理员停用的 lead 不能被委派角色重新启用
    const lead = otherLead();
    server.store.update('users', lead.id, { status: 'disabled' });
    const enable = call('PUT', `/api/v1/users/${lead.id}`, { token: session.token, body: { status: 'active' } });
    expect(enable.status).toBe(403);
    expect(byId(lead.id)!.status).toBe('disabled');
    expect(logsOf('userDisable').filter((log) => log.actorName === userByName('guest')!.name)).toHaveLength(0);
  });

  it('委派角色不能改 admin、lead 账号的资料字段（姓名 / 登录名 / 邮箱 / 部门）', () => {
    const session = delegate();
    const updatesBefore = logsOf('userUpdate').length;
    for (const target of privilegedTargets()) {
      const before = { ...byId(target.id)! };
      for (const body of [
        { name: '被委派改名' },
        { username: 'hijacked.account' },
        { email: 'attacker@example.com' },
        { department: before.department === 'support' ? 'platform' : 'support' },
      ]) {
        const res = call('PUT', `/api/v1/users/${target.id}`, { token: session.token, body });
        expect(res.status, `${target.username} ${JSON.stringify(body)} 应被拒`).toBe(403);
        expect(res.body.success).toBe(false);
      }
      expect(byId(target.id)).toEqual(before);
    }
    expect(userByName('hijacked.account')).toBeUndefined();
    expect(logsOf('userUpdate')).toHaveLength(updatesBefore);
  });

  it('委派角色单条 DELETE admin、lead 账号返回 403，账号仍在', () => {
    const session = delegate();
    const deletesBefore = logsOf('userDelete').length;
    for (const target of privilegedTargets()) {
      const res = call('DELETE', `/api/v1/users/${target.id}`, { token: session.token });
      expect(res.status, `${target.username} 不应被删除`).toBe(403);
      expect(byId(target.id)).toBeDefined();
    }
    expect(logsOf('userDelete')).toHaveLength(deletesBefore);
  });

  it('批量接口同样整批 403：停用 / 删除 / 启用都不产生部分写入', () => {
    const session = delegate();
    const [plain] = ordinary();
    const lead = otherLead();
    for (const action of ['disable', 'delete'] as const) {
      const res = call('POST', '/api/v1/users/batch', {
        token: session.token,
        body: { ids: [plain!.id, lead.id], action },
      });
      expect(res.status, `批量 ${action} 应被拒`).toBe(403);
      expect(byId(plain!.id)?.status, `批量 ${action} 不应先处理前面的普通账号`).toBe('active');
      expect(byId(lead.id)?.status).toBe('active');
    }
    server.store.update('users', lead.id, { status: 'disabled' });
    const enable = call('POST', '/api/v1/users/batch', {
      token: session.token,
      body: { ids: [lead.id], action: 'enable' },
    });
    expect(enable.status).toBe(403);
    expect(byId(lead.id)!.status).toBe('disabled');
  });

  it('伪造 token 里的签发角色不能冒充管理员：判定按用户记录上的业务角色', () => {
    delegate();
    const forged = issueDemoToken('guest', 'admin');
    const lead = otherLead();
    const res = call('PUT', `/api/v1/users/${lead.id}`, { token: forged, body: { status: 'disabled' } });
    expect(res.status).toBe(403);
    expect(byId(lead.id)!.status).toBe('active');
  });

  it('lead 角色即使持有用户编辑 / 删除权限，也不能维护其他 lead、admin 或自己的账号', () => {
    server.store.update('roles', 'lead', {
      permissions: [...DEFAULT_ROLE_PERMISSIONS.lead, 'system.user.update', 'system.user.delete'],
      updatedAt: NOW.toISOString(),
    });
    const lead = loginAs('lead');
    const peer = otherLead();
    expect(call('PUT', `/api/v1/users/${peer.id}`, { token: lead.token, body: { name: '同级改名' } }).status).toBe(403);
    expect(call('DELETE', `/api/v1/users/${peer.id}`, { token: lead.token }).status).toBe(403);
    expect(
      call('PUT', `/api/v1/users/${userByName('admin')!.id}`, { token: lead.token, body: { email: 'x@example.com' } })
        .status,
    ).toBe(403);
    expect(
      call('PUT', `/api/v1/users/${userByName('lead')!.id}`, { token: lead.token, body: { name: '自改资料' } }).status,
    ).toBe(403);
    expect(byId(peer.id)!.name).not.toBe('同级改名');
    expect(userByName('lead')!.name).not.toBe('自改资料');
    // 可分配范围内的账号照常可维护
    const [plain] = ordinary();
    expect(call('PUT', `/api/v1/users/${plain!.id}`, { token: lead.token, body: { name: '值班长改名' } }).status).toBe(
      200,
    );
  });

  it('委派角色对可分配范围内的账号照常可用（停用 / 启用 / 删除 / 批量）', () => {
    const session = delegate();
    const [a, b, c] = ordinary(3);
    expect(call('PUT', `/api/v1/users/${a!.id}`, { token: session.token, body: { status: 'disabled' } }).status).toBe(
      200,
    );
    expect(byId(a!.id)!.status).toBe('disabled');
    expect(
      call('POST', '/api/v1/users/batch', { token: session.token, body: { ids: [a!.id, b!.id], action: 'enable' } })
        .status,
    ).toBe(200);
    expect(byId(a!.id)!.status).toBe('active');
    expect(call('DELETE', `/api/v1/users/${c!.id}`, { token: session.token }).status).toBe(200);
    expect(byId(c!.id)).toBeUndefined();
  });

  it('管理员角色仍可维护 lead 账号：改资料、停用、启用、删除', () => {
    const admin = loginAs('admin');
    const lead = otherLead();
    expect(call('PUT', `/api/v1/users/${lead.id}`, { token: admin.token, body: { name: '管理员改名' } }).status).toBe(
      200,
    );
    expect(byId(lead.id)!.name).toBe('管理员改名');
    expect(
      call('POST', '/api/v1/users/batch', { token: admin.token, body: { ids: [lead.id], action: 'disable' } }).status,
    ).toBe(200);
    expect(byId(lead.id)!.status).toBe('disabled');
    expect(call('PUT', `/api/v1/users/${lead.id}`, { token: admin.token, body: { status: 'active' } }).status).toBe(
      200,
    );
    expect(byId(lead.id)!.status).toBe('active');
    // 体验账号 lead 的资料可改（登录名与停用 / 删除仍按体验账号规则保护）
    expect(
      call('PUT', `/api/v1/users/${userByName('lead')!.id}`, {
        token: admin.token,
        body: { email: 'lead2@example.com' },
      }).status,
    ).toBe(200);
    expect(userByName('lead')!.email).toBe('lead2@example.com');
    expect(call('DELETE', `/api/v1/users/${lead.id}`, { token: admin.token }).status).toBe(200);
    expect(byId(lead.id)).toBeUndefined();
  });

  it('无种子记录的演示登录名按签发角色判定（与它拿到全量权限的口径一致）', () => {
    const visitor = loginAs('demo.visitor');
    expect([...visitor.user.permissions].sort()).toEqual([...PERMISSION_KEYS].sort());
    const lead = otherLead();
    expect(
      call('PUT', `/api/v1/users/${lead.id}`, { token: visitor.token, body: { name: '演示管理员改名' } }).status,
    ).toBe(200);
    expect(byId(lead.id)!.name).toBe('演示管理员改名');
  });
});
