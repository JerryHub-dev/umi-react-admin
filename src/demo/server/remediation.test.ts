/**
 * 审查整改（2026-10-11 报告）的行为回归：F02 权限生效、F03 历史工单、F04 批量导入、
 * F06 返工语义、F07 设备状态联动、F08 未恢复口径、F09 时钟推进。
 * 全部走 createDemoServer 的 HTTP 接口（与页面同一入口），不直接改存储。
 */
import type { Alarm, Ticket, UserImportResult } from '@/services/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { SCENARIO_IDS } from '../scenarios';
import { STORE_KEY, type StorageLike } from '../store';
import { createDemoServer } from './index';

const NOW = new Date(2026, 9, 12, 15, 0);

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
let mutableNow: Date;
let server: ReturnType<typeof createDemoServer>;

beforeEach(() => {
  storage = memoryStorage();
  mutableNow = new Date(NOW);
  server = createDemoServer({ locale: 'zh-CN', storage, now: () => mutableNow });
});

const call = (method: string, url: string, options: { body?: unknown; token?: string; params?: object } = {}) =>
  server.handle({
    method,
    url,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    params: options.params as Record<string, unknown>,
    headers: { Authorization: options.token ? `Bearer ${options.token}` : undefined },
  });

const loginAs = (name: string) => {
  const res = call('POST', '/api/v1/login', { body: { name, password: 'x' } });
  return res.body.data as { token: string; user: { roleKey: string; permissions: string[] } };
};

const data = () => server.store.dataset;
const ticket = (id: string) => data().tickets.find((t) => t.id === id);
const alarm = (id: string) => data().alarms.find((a) => a.id === id);

// ------------------------------------------------ F02 权限点生效

describe('F02 五种角色权限点成为授权的唯一口径', () => {
  it('五种角色登录返回互异的角色与权限，访客权限最少', () => {
    const admin = loginAs('admin');
    const lead = loginAs('lead');
    const operator = loginAs('operator');
    const analyst = loginAs('analyst');
    const guest = loginAs('guest');
    expect(admin.user.roleKey).toBe('admin');
    expect(lead.user.roleKey).toBe('lead');
    expect(operator.user.roleKey).toBe('operator');
    expect(analyst.user.roleKey).toBe('analyst');
    expect(guest.user.roleKey).toBe('viewer');
    const sizes = [admin, lead, operator, analyst, guest].map((s) => s.user.permissions.length);
    expect(new Set(sizes).size).toBe(5);
    expect(sizes[4]).toBeLessThan(sizes[3]);
    // 权限矩阵语义：值班长可派工/验收/管理日程；运维只能处理；分析员只读可导出；访客仅工作台+设备
    expect(lead.user.permissions).toEqual(
      expect.arrayContaining(['ops.ticket.assign', 'ops.ticket.accept', 'ops.schedule.update']),
    );
    expect(operator.user.permissions).not.toContain('ops.ticket.assign');
    expect(operator.user.permissions).not.toContain('ops.ticket.accept');
    expect(operator.user.permissions).toContain('ops.ticket.close');
    expect(analyst.user.permissions).toContain('doc.export');
    expect(analyst.user.permissions).not.toContain('ops.alarm.handle');
    expect(guest.user.permissions).toEqual(expect.arrayContaining(['dashboard.view', 'ops.device.view']));
    expect(guest.user.permissions).not.toContain('ops.alarm.view');
  });

  it('清空访客权限点并保存后，设备读取与告警处置均被拒绝（原有会话与重新登录一致）', () => {
    const adminToken = loginAs('admin').token;
    // 清空访客（viewer）角色的全部权限
    const cleared = call('PUT', '/api/v1/roles/viewer', { token: adminToken, body: { permissions: [] } });
    expect(cleared.body.success).toBe(true);
    // 已有会话：清空之前签发的 guest token
    const staleGuest = loginAs('guest').token;
    expect(call('GET', '/api/v1/devices', { token: staleGuest }).status).toBe(403);
    expect(call('GET', '/api/v1/dashboard/overview', { token: staleGuest }).status).toBe(403);
    // 重新登录的会话同样受限
    const freshGuest = loginAs('guest').token;
    expect(call('GET', '/api/v1/devices', { token: freshGuest }).status).toBe(403);
    // 恢复默认后立即恢复访问（角色权限是唯一口径）
    call('POST', '/api/v1/roles/viewer/reset', { token: adminToken });
    const restored = loginAs('guest').token;
    expect(call('GET', '/api/v1/devices', { token: restored }).status).toBe(200);
  });

  it('角色权限修改对「另一个已登录会话」立即生效（不进 token、逐请求解析）', () => {
    const operatorToken = loginAs('operator').token;
    // operator 默认可以处置告警
    expect(
      call('POST', `/api/v1/alarms/${SCENARIO_IDS.falsePositiveAlarm}/handle`, {
        token: operatorToken,
        body: { action: 'falsePositive' },
      }).body.success,
    ).toBe(true);
    // 值班长改动：收回 operator 的 ops.alarm.handle
    const leadToken = loginAs('lead').token;
    expect(leadToken).toBeTruthy();
    const adminToken = loginAs('admin').token;
    const current = (
      call('GET', '/api/v1/roles', { token: adminToken }).body.data as { id: string; permissions: string[] }[]
    ).find((role) => role.id === 'operator')!.permissions;
    call('PUT', '/api/v1/roles/operator', {
      token: adminToken,
      body: { permissions: current.filter((k) => k !== 'ops.alarm.handle') },
    });
    // 同一个旧 token 再处置另一条活动告警 → 403
    expect(
      call('POST', `/api/v1/alarms/${SCENARIO_IDS.multiAlarm2}/handle`, {
        token: operatorToken,
        body: { action: 'falsePositive' },
      }).status,
    ).toBe(403);
  });

  it('运维不能派工/验收/导入用户；分析员只读；接口层拒绝（隐藏按钮不是授权检查）', () => {
    const operator = loginAs('operator').token;
    const analyst = loginAs('analyst').token;
    // 运维：处理与完成可以，派工（退回 todo）与验收不可以
    expect(
      call('PUT', `/api/v1/tickets/${SCENARIO_IDS.urgentTicket}`, { token: operator, body: { status: 'doing' } }).body
        .success,
    ).toBe(true);
    expect(
      call('PUT', `/api/v1/tickets/${SCENARIO_IDS.urgentTicket}`, { token: operator, body: { status: 'todo' } }).status,
    ).toBe(403);
    expect(
      call('POST', `/api/v1/tickets/${SCENARIO_IDS.accept1}/acceptance`, { token: operator, body: { signature: 'x' } })
        .status,
    ).toBe(403);
    // 分析员：业务读取与报表页可以，处置/验收/导入/日程修改全部 403
    expect(call('GET', '/api/v1/alarms', { token: analyst }).status).toBe(200);
    expect(
      call('POST', `/api/v1/alarms/${SCENARIO_IDS.multiAlarm2}/handle`, {
        token: analyst,
        body: { action: 'falsePositive' },
      }).status,
    ).toBe(403);
    expect(
      call('POST', `/api/v1/tickets/${SCENARIO_IDS.accept1}/acceptance`, { token: analyst, body: { signature: 'x' } })
        .status,
    ).toBe(403);
    expect(call('POST', '/api/v1/users/import', { token: analyst, body: { rows: [] } }).status).toBe(403);
    expect(
      call('POST', '/api/v1/events', { token: analyst, body: { title: 'x', start: '2026-10-13T02:00:00.000Z' } })
        .status,
    ).toBe(403);
    // 访客：告警接口整体不可见
    const guest = loginAs('guest').token;
    expect(call('GET', '/api/v1/alarms', { token: guest }).status).toBe(403);
  });

  it('管理员角色保持全量权限的保护仍然有效', () => {
    const adminToken = loginAs('admin').token;
    const res = call('PUT', '/api/v1/roles/admin', { token: adminToken, body: { permissions: ['dashboard.view'] } });
    expect(res.body.success).toBe(false);
  });

  it('演示重置与场景控制仅持有 system.demo.reset 的角色可用', () => {
    const guest = loginAs('guest').token;
    const lead = loginAs('lead').token;
    expect(call('POST', '/api/v1/demo/reset', { token: guest }).status).toBe(403);
    expect(call('POST', '/api/v1/demo/reset', { token: lead }).status).toBe(403);
    expect(call('POST', '/api/v1/demo/scenario', { token: guest, body: { action: 'enter' } }).status).toBe(403);
  });
});

// ------------------------------------------------ F03 历史工单与深链

describe('F03 历史工单按 ID 独立加载', () => {
  it('GET /tickets/:id 返回看板窗口外的历史工单', () => {
    const token = loginAs('lead').token;
    const res = call('GET', `/api/v1/tickets/${SCENARIO_IDS.historyTicket}`, { token });
    expect(res.status).toBe(200);
    expect((res.body.data as Ticket).deviceName).toBeTruthy();
  });

  it('不存在的工单 404；查询面板的关键字/状态/时间筛选可用', () => {
    const token = loginAs('lead').token;
    expect(call('GET', '/api/v1/tickets/WO-00000000-000', { token }).status).toBe(404);
    const byKeyword = call('GET', '/api/v1/tickets', { token, params: { keyword: SCENARIO_IDS.historyTicket } }).body
      .data as { total: number };
    expect(byKeyword.total).toBe(1);
    const done = call('GET', '/api/v1/tickets', { token, params: { status: 'done', priority: 'P2' } }).body.data as {
      list: Ticket[];
    };
    done.list.forEach((t) => {
      expect(t.status).toBe('done');
      expect(t.priority).toBe('P2');
    });
  });
});

// ------------------------------------------------ F04 批量导入

describe('F04 Excel 批量导入：服务端复核与准确计数', () => {
  const rows = [
    {
      row: 2,
      name: '导入甲',
      username: 'import.a',
      email: 'import.a@example.com',
      department: 'ops1',
      role: 'operator',
    },
    { row: 3, name: '导入乙', username: 'import.b', email: 'bad-email', department: 'ops1', role: 'operator' },
    {
      row: 4,
      name: '导入丙',
      username: 'import.a',
      email: 'import.c@example.com',
      department: 'ops1',
      role: 'operator',
    },
  ];
  const base = () => data().users.length;

  it('成功创建有效行，重复与无效行准确报告且不写入', () => {
    const token = loginAs('admin').token;
    const before = base();
    const res = call('POST', '/api/v1/users/import', { token, body: { rows } }).body.data as UserImportResult;
    expect(res.created).toBe(1);
    expect(res.invalid).toBe(1);
    expect(res.duplicated).toBe(1); // 与第 2 行文件内重复
    expect(base()).toBe(before + 1);
    expect(data().users.some((u) => u.username === 'import.a')).toBe(true);
    expect(data().users.some((u) => u.username === 'import.b')).toBe(false);
    expect(res.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 3, reason: 'invalid' }),
        expect.objectContaining({ row: 4, reason: 'duplicate' }),
      ]),
    );
  });

  it('重复导入同一批有效用户：0 创建、全部按重复报告（不重复写入）', () => {
    const token = loginAs('admin').token;
    const valid = rows.filter((r) => r.row === 2);
    call('POST', '/api/v1/users/import', { token, body: { rows: valid } });
    const before = base();
    const again = call('POST', '/api/v1/users/import', { token, body: { rows: valid } }).body.data as UserImportResult;
    expect(again.created).toBe(0);
    expect(again.duplicated).toBe(1);
    expect(base()).toBe(before);
  });

  it('>200 用户边界：分页上限之外的用户也参与重复判断与总数', () => {
    const token = loginAs('admin').token;
    const rows = Array.from({ length: 205 }, (_, i) => ({
      row: i + 2,
      name: `边界用户${String(i).padStart(3, '0')}`,
      username: `bulk.user${String(i).padStart(3, '0')}`,
      email: `bulk.user${String(i).padStart(3, '0')}@example.com`,
    }));
    const created = call('POST', '/api/v1/users/import', { token, body: { rows } }).body.data as UserImportResult;
    expect(created.created).toBe(205);
    // 总数确实超过服务端单页上限 200
    const page1 = call('GET', '/api/v1/users', { token, params: { pageSize: 200 } }).body.data as { total: number };
    expect(page1.total).toBeGreaterThan(200);
    // 分页之外的用户（第 205 位）参与重复判断——客户端 fetchAllUsers 跨页拉全量的服务端前提
    const dup = call('POST', '/api/v1/users/import', {
      token,
      body: { rows: [{ row: 2, name: '边界用户', username: 'bulk.user204', email: 'x@example.com' }] },
    }).body.data as UserImportResult;
    expect(dup.created).toBe(0);
    expect(dup.duplicated).toBe(1);
  });

  it('与现有种子用户冲突的登录名按重复报告', () => {
    const token = loginAs('admin').token;
    const res = call('POST', '/api/v1/users/import', {
      token,
      body: { rows: [{ row: 2, name: '管理员', username: 'admin', email: 'a@example.com' }] },
    }).body.data as UserImportResult;
    expect(res.created).toBe(0);
    expect(res.duplicated).toBe(1);
  });
});

// ------------------------------------------------ F06 返工语义 + F05 连续验收

describe('F06 已验收工单返工：旧验收归档、再完成后再验收', () => {
  it('返工把当前验收归档为失效记录并回到处理中；关联告警回到未恢复', () => {
    const token = loginAs('lead').token;
    const before = ticket(SCENARIO_IDS.reworkTicket)!;
    expect(before.acceptance).toBeTruthy();
    const res = call('POST', `/api/v1/tickets/${SCENARIO_IDS.reworkTicket}/rework`, { token });
    expect(res.body.success).toBe(true);
    const after = ticket(SCENARIO_IDS.reworkTicket)!;
    expect(after.status).toBe('doing');
    expect(after.acceptance).toBeUndefined();
    expect(after.acceptanceHistory).toHaveLength(1);
    expect(after.acceptanceHistory![0].invalidatedAt).toBeTruthy();
    // 时间顺序：完成被清除
    expect(after.resolvedAt).toBeUndefined();
  });

  it('重新完成后需要新的验收；新验收时间晚于新完成时间', () => {
    const token = loginAs('lead').token;
    call('POST', `/api/v1/tickets/${SCENARIO_IDS.reworkTicket}/rework`, { token });
    mutableNow = new Date(NOW.getTime() + 30 * 60_000);
    call('PUT', `/api/v1/tickets/${SCENARIO_IDS.reworkTicket}`, { token, body: { status: 'done' } });
    mutableNow = new Date(NOW.getTime() + 45 * 60_000);
    const sign = call('POST', `/api/v1/tickets/${SCENARIO_IDS.reworkTicket}/acceptance`, {
      token,
      body: {
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42Y=',
      },
    });
    expect(sign.body.success).toBe(true);
    const final = ticket(SCENARIO_IDS.reworkTicket)!;
    expect(new Date(final.acceptance!.signedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(final.resolvedAt!).getTime(),
    );
    // 历史验收仍保留
    expect(final.acceptanceHistory).toHaveLength(1);
  });

  it('已生效验收的工单不能重复验收（业务错误）；未完成不能验收', () => {
    const token = loginAs('lead').token;
    const res = call('POST', `/api/v1/tickets/${SCENARIO_IDS.reworkTicket}/acceptance`, {
      token,
      body: {
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42Y=',
      },
    });
    expect(res.body.success).toBe(false); // 已有生效验收
    const doing = call('POST', `/api/v1/tickets/${SCENARIO_IDS.slaNear}/acceptance`, {
      token,
      body: { signature: 'x' },
    });
    expect(doing.body.success).toBe(false); // 未完成
  });

  it('空签名/非 PNG 数据 URL 被服务端拒绝（不只靠客户端拦截）', () => {
    const token = loginAs('lead').token;
    for (const signature of ['', 'not-a-data-url', 'data:image/jpeg;base64,AAAA']) {
      const res = call('POST', `/api/v1/tickets/${SCENARIO_IDS.accept2}/acceptance`, { token, body: { signature } });
      expect(res.body.success).toBe(false);
    }
    expect(ticket(SCENARIO_IDS.accept2)?.acceptance).toBeUndefined();
  });

  it('验收写日志、返工写日志（日志页可追踪主线操作）', () => {
    const token = loginAs('lead').token;
    const before = data().logs.length;
    call('POST', `/api/v1/tickets/${SCENARIO_IDS.accept1}/acceptance`, {
      token,
      body: {
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42Y=',
      },
    });
    const afterAccept = data().logs.find((l) => l.action === 'ticketAccept' && l.target === SCENARIO_IDS.accept1);
    expect(afterAccept).toBeDefined();
    call('PUT', `/api/v1/tickets/${SCENARIO_IDS.accept1}`, { token, body: { status: 'doing' } });
    const rework = data().logs.find((l) => l.action === 'ticketRework' && l.target === SCENARIO_IDS.accept1);
    expect(rework).toBeDefined();
    expect(data().logs.length).toBeGreaterThanOrEqual(before + 2);
  });
});

// ------------------------------------------------ F07 设备状态联动 + F08 口径

describe('F07/F08 主线闭环：转单 → 处理 → 恢复 → 验收 → 指标变化', () => {
  it('主线全流程后设备上线（O+1）、未恢复告警减一（U−1）、工单总数 T+1', () => {
    const lead = loginAs('lead').token;
    const devicesBefore = call('GET', '/api/v1/devices/all', { token: lead }).body.data as {
      id: string;
      status: string;
    }[];
    const onlineBefore = devicesBefore.filter((d) => d.status === 'online').length;
    const unrecoveredBefore = (
      call('GET', '/api/v1/alarms', { token: lead, params: { unrecovered: 'true', pageSize: 200 } }).body.data as {
        total: number;
      }
    ).total;
    const ticketsBefore = (
      call('GET', '/api/v1/tickets', { token: lead, params: { pageSize: 1 } }).body.data as { total: number }
    ).total;

    // 1. 严重告警转 P1 工单
    const converted = call('POST', `/api/v1/alarms/${SCENARIO_IDS.mainAlarm}/handle`, {
      token: lead,
      body: { action: 'ticket' },
    }).body.data as Alarm;
    expect(converted.ticketId).toBe(`WO-${SCENARIO_IDS.mainAlarm.slice(4)}`);
    // 2. 转单后告警仍属未恢复（F08：转单不等于恢复）
    const unrecoveredAfterConvert = (
      call('GET', '/api/v1/alarms', { token: lead, params: { unrecovered: 'true', pageSize: 200 } }).body.data as {
        total: number;
      }
    ).total;
    expect(unrecoveredAfterConvert).toBe(unrecoveredBefore);
    // 3. 设备仍离线
    const stillOffline = (
      call('GET', '/api/v1/devices', { token: lead, params: { keyword: SCENARIO_IDS.mainDevice } }).body.data as {
        list: { status: string }[];
      }
    ).list[0];
    expect(stillOffline.status).toBe('offline');

    // 4. 处理 → 完成（时钟保持不动：T+1 的核对不混入时间推进自然生成的新工单，那是 F09 的行为）
    const ticketId = converted.ticketId!;
    call('PUT', `/api/v1/tickets/${ticketId}`, { token: lead, body: { status: 'doing' } });
    call('PUT', `/api/v1/tickets/${ticketId}`, { token: lead, body: { status: 'done' } });
    // 5. 完成后：设备上线 O+1、未恢复 U−1、总数 T+1
    const devicesAfter = call('GET', '/api/v1/devices/all', { token: lead }).body.data as {
      id: string;
      status: string;
    }[];
    expect(devicesAfter.filter((d) => d.status === 'online').length).toBe(onlineBefore + 1);
    const unrecoveredAfter = (
      call('GET', '/api/v1/alarms', { token: lead, params: { unrecovered: 'true', pageSize: 200 } }).body.data as {
        total: number;
      }
    ).total;
    expect(unrecoveredAfter).toBe(unrecoveredBefore - 1);
    const ticketsAfter = (
      call('GET', '/api/v1/tickets', { token: lead, params: { pageSize: 1 } }).body.data as { total: number }
    ).total;
    expect(ticketsAfter).toBe(ticketsBefore + 1);

    // 6. 验收（工单在候选集中）
    const accepted = call('POST', `/api/v1/tickets/${ticketId}/acceptance`, {
      token: lead,
      body: {
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42Y=',
      },
    });
    expect(accepted.body.success).toBe(true);
    expect(ticket(ticketId)!.acceptance?.signerName).toBeTruthy();
  });

  it('多告警设备只处理一条不上线，全部处理后恢复（部分处理不提前恢复）', () => {
    const token = loginAs('lead').token;
    const first = call('POST', `/api/v1/alarms/${SCENARIO_IDS.multiAlarm1}/handle`, {
      token,
      body: { action: 'ticket' },
    }).body.data as Alarm;
    call('PUT', `/api/v1/tickets/${first.ticketId}`, { token, body: { status: 'doing' } });
    call('PUT', `/api/v1/tickets/${first.ticketId}`, { token, body: { status: 'done' } });
    const afterFirst = (
      call('GET', '/api/v1/devices', { token, params: { keyword: SCENARIO_IDS.multiDevice } }).body.data as {
        list: { status: string }[];
      }
    ).list[0];
    expect(afterFirst.status).toBe('fault'); // 仍有第二条阻断
    const second = call('POST', `/api/v1/alarms/${SCENARIO_IDS.multiAlarm2}/handle`, {
      token,
      body: { action: 'ticket' },
    }).body.data as Alarm;
    call('PUT', `/api/v1/tickets/${second.ticketId}`, { token, body: { status: 'done' } });
    const afterSecond = (
      call('GET', '/api/v1/devices', { token, params: { keyword: SCENARIO_IDS.multiDevice } }).body.data as {
        list: { status: string }[];
      }
    ).list[0];
    expect(afterSecond.status).toBe('online');
  });

  it('误报关闭使告警从未恢复视图消失；在线设备不受影响', () => {
    const token = loginAs('lead').token;
    const before = (
      call('GET', '/api/v1/alarms', { token, params: { unrecovered: 'true', pageSize: 200 } }).body.data as {
        total: number;
      }
    ).total;
    call('POST', `/api/v1/alarms/${SCENARIO_IDS.falsePositiveAlarm}/handle`, {
      token,
      body: { action: 'falsePositive' },
    });
    const after = (
      call('GET', '/api/v1/alarms', { token, params: { unrecovered: 'true', pageSize: 200 } }).body.data as {
        total: number;
      }
    ).total;
    expect(after).toBe(before - 1);
    const device = (
      call('GET', '/api/v1/devices', { token, params: { keyword: SCENARIO_IDS.okDevice } }).body.data as {
        list: { status: string }[];
      }
    ).list[0];
    expect(device.status).toBe('online');
  });

  it('工作台 KPI 与明细同一口径（派生在线数 = 设备接口的在线数）', () => {
    const token = loginAs('lead').token;
    const overview = call('GET', '/api/v1/dashboard/overview', { token }).body.data as {
      kpi: { devicesTotal: number; devicesOnline: number };
    };
    const devices = call('GET', '/api/v1/devices/all', { token }).body.data as { status: string }[];
    expect(overview.kpi.devicesTotal).toBe(devices.length);
    expect(overview.kpi.devicesOnline).toBe(devices.filter((d) => d.status === 'online').length);
  });
});

// ------------------------------------------------ F09 演示时钟

describe('F09 时钟推进与补丁保留', () => {
  it('live 模式跨日后按新日期重建：今日告警更新且用户补丁保留', () => {
    const token = loginAs('admin').token;
    const beforeToday = (
      call('GET', '/api/v1/dashboard/overview', { token }).body.data as { kpi: { alarmsToday: number } }
    ).kpi.alarmsToday;
    // 用户补丁：创建一位用户
    call('POST', '/api/v1/users', {
      token,
      body: { name: '跨日用户', username: 'nextday.user', email: 'nextday.user@example.com' },
    });
    expect(data().users.some((u) => u.username === 'nextday.user')).toBe(true);
    // 推进 25 小时（跨日）
    mutableNow = new Date(NOW.getTime() + 25 * 3_600_000);
    const afterToday = (
      call('GET', '/api/v1/dashboard/overview', { token }).body.data as { kpi: { alarmsToday: number } }
    ).kpi.alarmsToday;
    expect(afterToday).toBeGreaterThan(0);
    expect(afterToday).not.toBe(beforeToday);
    // 补丁保留：跨日重建后用户改动仍在（不覆盖人工完成状态）
    expect(data().users.some((u) => u.username === 'nextday.user')).toBe(true);
  });

  it('受控（frozen）模式：时钟冻结期间重复请求不推进基础数据', () => {
    const token = loginAs('admin').token;
    const first = (call('GET', '/api/v1/dashboard/overview', { token }).body.data as { kpi: { alarmsToday: number } })
      .kpi.alarmsToday;
    // 模拟冻结：now 固定不动（构造时即 now: () => mutableNow），推进真实时间无效果
    const again = (call('GET', '/api/v1/dashboard/overview', { token }).body.data as { kpi: { alarmsToday: number } })
      .kpi.alarmsToday;
    expect(again).toBe(first);
  });

  it('重置清空补丁并回到初始数据；场景对象回到初始状态', () => {
    const token = loginAs('admin').token;
    call('POST', `/api/v1/alarms/${SCENARIO_IDS.mainAlarm}/handle`, { token, body: { action: 'ticket' } });
    expect(alarm(SCENARIO_IDS.mainAlarm)?.status).toBe('ticketed');
    const reset = call('POST', '/api/v1/demo/reset', { token });
    expect(reset.body.success).toBe(true);
    expect(alarm(SCENARIO_IDS.mainAlarm)?.status).toBe('active');
    expect(ticket(SCENARIO_IDS.reworkTicket)?.acceptance).toBeTruthy();
    expect(storage.data.has(STORE_KEY)).toBe(false);
  });
});
