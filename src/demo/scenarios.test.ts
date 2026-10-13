import { safeSignature } from '@/utils/signature';
import { describe, expect, it } from 'vitest';
import { DAY, generateDataset } from './generate';
import { DEMO_ACCOUNTS, SCENARIO_IDS as IDS, SCENARIO_MANIFEST, verifyScenarios } from './scenarios';

describe('固定场景（D02）：任意演示日都存在且引用完整', () => {
  const SAMPLES = [
    new Date(2026, 9, 12, 9, 0), // 周一上午
    new Date(2026, 9, 15, 23, 45), // 周四深夜（接近跨日）
    new Date(2026, 11, 31, 23, 30), // 年末边界
    new Date(2027, 0, 1, 0, 15), // 年初边界
    new Date(2026, 1, 27, 12, 0), // 月末（2 月）
  ];

  it.each(SAMPLES.map((now) => [now.toDateString(), now] as const))('%s：场景覆盖检查通过', (_label, now) => {
    const data = generateDataset({ now });
    const problems = verifyScenarios(data, now);
    expect(problems).toEqual([]);
  });

  it('场景清单（SCENARIO_MANIFEST）覆盖全部场景键且对象引用存在', () => {
    const data = generateDataset({ now: new Date(2026, 9, 12, 15, 0) });
    const known = new Set([
      ...data.devices.map((d) => d.id),
      ...data.alarms.map((a) => a.id),
      ...data.tickets.map((t) => t.id),
      ...data.events.map((e) => e.id),
    ]);
    expect(SCENARIO_MANIFEST.length).toBeGreaterThanOrEqual(12);
    SCENARIO_MANIFEST.forEach((scenario) => {
      expect(scenario.key).toBeTruthy();
      scenario.objects.forEach((id) => expect(known.has(id)).toBe(true));
    });
  });

  it('中英文使用同一对象身份（角色/语言切换不生成另一套数据）', () => {
    const now = new Date(2026, 9, 12, 15, 0);
    const zh = generateDataset({ now, locale: 'zh-CN' });
    const en = generateDataset({ now, locale: 'en-US' });
    const zhAlarms = new Map(zh.alarms.map((a) => [a.id, a]));
    en.alarms.forEach((a) => {
      expect(zhAlarms.has(a.id)).toBe(true);
      expect(a.deviceId).toBe(zhAlarms.get(a.id)!.deviceId);
    });
    const zhTickets = new Map(zh.tickets.map((t) => [t.id, t]));
    Object.values(IDS)
      .filter((id) => typeof id === 'string' && id.startsWith('WO-SCN'))
      .forEach((id) => {
        expect(zhTickets.has(id)).toBe(true);
        expect(en.tickets.find((t) => t.id === id)?.deviceId).toBe(zhTickets.get(id)!.deviceId);
      });
  });

  it('数据规模与维度保留（D01）：不因场景缩减', () => {
    const data = generateDataset({ now: new Date(2026, 9, 12, 15, 0) });
    expect(data.devices.length).toBeGreaterThanOrEqual(240);
    expect(data.users).toHaveLength(86);
    expect(data.alarms.length).toBeGreaterThan(1400);
    expect(data.tickets.length).toBeGreaterThan(400);
    expect(data.events.length).toBeGreaterThanOrEqual(45);
    expect(data.logs.length).toBeGreaterThan(300);
    // 告警覆盖四个级别与六种类型；工单覆盖故障/巡检与三种状态
    expect(new Set(data.alarms.map((a) => a.level)).size).toBe(4);
    expect(new Set(data.alarms.map((a) => a.type)).size).toBe(6);
    expect(new Set(data.tickets.map((t) => t.kind)).size).toBe(2);
    expect(new Set(data.tickets.map((t) => t.status)).size).toBe(3);
  });

  it('五种快捷体验账号存在、启用且角色互异', () => {
    const data = generateDataset({ now: new Date(2026, 9, 12, 15, 0) });
    const byName = new Map(data.users.map((u) => [u.username, u]));
    DEMO_ACCOUNTS.forEach((name) => {
      const user = byName.get(name);
      if (!user) throw new Error(`demo account missing: ${name}`);
      expect(user.status).toBe('active');
    });
    expect(new Set(DEMO_ACCOUNTS.map((name) => byName.get(name)!.role)).size).toBe(5);
  });
});

describe('场景时序与互斥（D02/D03）', () => {
  const NOW = new Date(2026, 9, 12, 15, 0);
  const data = generateDataset({ now: NOW });
  const t = (v: string) => new Date(v).getTime();
  const ticket = (id: string) => data.tickets.find((x) => x.id === id)!;

  it('主线：未转单的严重阻断告警 + 离线设备，且是该设备唯一阻断故障', () => {
    const main = data.alarms.find((a) => a.id === IDS.mainAlarm)!;
    expect(main.status).toBe('active');
    expect(main.ticketId).toBeUndefined();
    expect(main.level).toBe('critical');
    expect(data.devices.find((d) => d.id === IDS.mainDevice)?.status).toBe('offline');
    const blocking = data.alarms.filter(
      (a) => a.deviceId === IDS.mainDevice && ['active', 'ticketed'].includes(a.status) && !a.recoveredAt,
    );
    expect(blocking).toHaveLength(1);
  });

  it('紧急待办是未完成 P1；时限对比覆盖四种状态', () => {
    const urgent = ticket(IDS.urgentTicket);
    expect(urgent.priority).toBe('P1');
    expect(urgent.status).toBe('todo');
    const near = ticket(IDS.slaNear);
    const over = ticket(IDS.slaOver);
    const ok = ticket(IDS.slaOk);
    const late = ticket(IDS.slaLate);
    // 接近时限：尚未完成且距截止不足 3 小时
    expect(near.status).toBe('doing');
    expect(t(near.createdAt) + near.slaHours * 3_600_000 - NOW.getTime()).toBeLessThan(3 * 3_600_000);
    // 已逾期未完成
    expect(over.status).toBe('doing');
    expect(NOW.getTime() - (t(over.createdAt) + over.slaHours * 3_600_000)).toBeGreaterThan(0);
    // 时限内完成 / 逾期完成
    expect(ok.resolvedAt! && t(ok.resolvedAt) - t(ok.createdAt) <= ok.slaHours * 3_600_000).toBe(true);
    expect(late.resolvedAt! && t(late.resolvedAt) - t(late.createdAt) > late.slaHours * 3_600_000).toBe(true);
  });

  it('连续验收：两张彼此独立、已完成未验收；已验收与待验收不并存', () => {
    [IDS.accept1, IDS.accept2].forEach((id) => {
      const item = ticket(id);
      expect(item.status).toBe('done');
      expect(item.acceptance).toBeUndefined();
    });
    expect(ticket(IDS.accept1).deviceId).not.toBe(ticket(IDS.accept2).deviceId);
    const rework = ticket(IDS.reworkTicket);
    expect(rework.status).toBe('done');
    expect(rework.acceptance?.signature).toBeTruthy();
    expect(safeSignature(rework.acceptance!.signature)).toBeTruthy();
    expect(t(rework.acceptance!.signedAt)).toBeGreaterThanOrEqual(t(rework.resolvedAt!));
  });

  it('历史工单完成超过三天（看板窗口之外）且关联告警已恢复', () => {
    const hist = ticket(IDS.historyTicket);
    expect(NOW.getTime() - t(hist.resolvedAt!)).toBeGreaterThan(3 * DAY);
    const alarm = data.alarms.find((a) => a.id === IDS.historyAlarm)!;
    expect(alarm.ticketId).toBe(IDS.historyTicket);
    expect(alarm.recoveredAt).toBeTruthy();
  });

  it('误报样本不阻断设备可用性；正常场景设备在线', () => {
    const fp = data.alarms.find((a) => a.id === IDS.falsePositiveAlarm)!;
    expect(fp.status).toBe('active');
    expect(fp.level).toBe('minor');
    expect(data.devices.find((d) => d.id === fp.deviceId)?.status).toBe('online');
    expect(data.devices.find((d) => d.id === IDS.okDevice)?.status).toBe('online');
  });

  it('例行巡检四态齐全且时限是 14 天', () => {
    const states = [IDS.maintenanceScheduled, IDS.maintenanceToday, IDS.maintenanceDoing, IDS.maintenanceDone].map(
      (id) => ticket(id).status,
    );
    expect(states).toEqual(expect.arrayContaining(['todo', 'doing', 'done']));
    [IDS.maintenanceScheduled, IDS.maintenanceToday, IDS.maintenanceDoing, IDS.maintenanceDone].forEach((id) => {
      expect(ticket(id).kind).toBe('maintenance');
      expect(ticket(id).slaHours).toBe(14 * 24);
    });
  });

  it('日程覆盖今天稍后/明天/全天/跨天/跨月', () => {
    const event = (id: string) => data.events.find((e) => e.id === id)!;
    expect(t(event(IDS.eventToday).start)).toBeGreaterThan(NOW.getTime());
    expect(t(event(IDS.eventTomorrow).start)).toBeGreaterThan(NOW.getTime());
    expect(event(IDS.eventAllDay).allDay).toBe(true);
    expect(new Date(event(IDS.eventMultiDay).end!).getDate()).toBeGreaterThan(
      new Date(event(IDS.eventMultiDay).start).getDate(),
    );
    const cross = event(IDS.eventCrossMonth);
    expect(new Date(cross.end!).getMonth()).toBeGreaterThan(new Date(cross.start).getMonth() % 12);
  });
});
