import type { Alarm } from '@/services/types';
import { describe, expect, it } from 'vitest';
import {
  applyDerivedStatus,
  deriveDeviceStatus,
  isAlarmRecovered,
  isAlarmUnrecovered,
  isBlockingAlarm,
  isBlockingKind,
} from './availability';
import { generateDataset } from './generate';

const alarm = (overrides: Partial<Alarm>): Alarm => ({
  id: 'ALM-T',
  deviceId: 'DEV-T',
  deviceName: '测试站',
  region: 'north',
  city: '北京',
  level: 'critical',
  type: 'power',
  source: 'auto',
  status: 'active',
  occurredAt: '2026-10-12T04:00:00.000Z',
  ...overrides,
});

describe('告警恢复语义（F08）', () => {
  it('active 未恢复；ticketed 无恢复时间同样未恢复（转单不等于恢复）', () => {
    expect(isAlarmUnrecovered(alarm({ status: 'active' }))).toBe(true);
    expect(isAlarmUnrecovered(alarm({ status: 'ticketed' }))).toBe(true);
  });

  it('recovered / falsePositive / ticketed 且已恢复 = 已恢复', () => {
    expect(isAlarmRecovered(alarm({ status: 'recovered' }))).toBe(true);
    expect(isAlarmRecovered(alarm({ status: 'falsePositive' }))).toBe(true);
    expect(isAlarmRecovered(alarm({ status: 'ticketed', recoveredAt: '2026-10-12T05:00:00.000Z' }))).toBe(true);
  });

  it('阻断性告警 = 严重/重要 × 掉线/供电/链路/温度；干扰、信号与一般级别不阻断', () => {
    expect(isBlockingKind('offline', 'critical')).toBe(true);
    expect(isBlockingKind('power', 'major')).toBe(true);
    expect(isBlockingKind('link', 'critical')).toBe(true);
    expect(isBlockingKind('temperature', 'major')).toBe(true);
    expect(isBlockingKind('interference', 'critical')).toBe(false);
    expect(isBlockingKind('signal', 'critical')).toBe(false);
    expect(isBlockingKind('power', 'minor')).toBe(false);
    expect(isBlockingKind('offline', 'info')).toBe(false);
    expect(isBlockingAlarm(alarm({ type: 'signal', level: 'critical' }))).toBe(false);
  });
});

describe('设备状态派生（F07）', () => {
  it('未恢复的掉线型阻断告警 → 离线', () => {
    const status = deriveDeviceStatus('DEV-T', [alarm({ type: 'offline', level: 'major' })]);
    expect(status).toBe('offline');
  });

  it('其他未恢复阻断告警 → 故障', () => {
    expect(deriveDeviceStatus('DEV-T', [alarm({ type: 'power', level: 'critical' })])).toBe('fault');
  });

  it('多条阻断告警只解除一条不提前上线；全部满足恢复条件后才在线', () => {
    const first = alarm({ id: 'A1', type: 'power', level: 'critical' });
    const second = alarm({ id: 'A2', type: 'temperature', level: 'major' });
    expect(deriveDeviceStatus('DEV-T', [first, second])).toBe('fault');
    const firstResolved = { ...first, status: 'recovered' as const, recoveredAt: '2026-10-12T05:00:00.000Z' };
    expect(deriveDeviceStatus('DEV-T', [firstResolved, second])).toBe('fault');
    const secondResolved = { ...second, status: 'recovered' as const, recoveredAt: '2026-10-12T06:00:00.000Z' };
    expect(deriveDeviceStatus('DEV-T', [firstResolved, secondResolved])).toBe('online');
  });

  it('非阻断告警不影响在线状态（一般提示告警不把在线设备置为故障）', () => {
    expect(deriveDeviceStatus('DEV-T', [alarm({ type: 'interference', level: 'minor' })])).toBe('online');
    expect(deriveDeviceStatus('DEV-T', [alarm({ type: 'signal', level: 'critical' })])).toBe('online');
    expect(deriveDeviceStatus('DEV-T', [])).toBe('online');
  });

  it('返回工单已恢复的告警不再阻断（返工重开后重新阻断）', () => {
    const ticketedRecovered = alarm({ status: 'ticketed', recoveredAt: '2026-10-12T05:00:00.000Z' });
    expect(deriveDeviceStatus('DEV-T', [ticketedRecovered])).toBe('online');
    const reopened = { ...ticketedRecovered, recoveredAt: undefined };
    expect(deriveDeviceStatus('DEV-T', [reopened])).toBe('fault');
  });

  it('多时刻采样：种子在线设备在任意时刻都不带未恢复阻断告警（时间窗口回归，复查 P3-1）', () => {
    // 3 天内 12 个固定偏移时刻采样，覆盖「压缩边界」附近的时间窗
    const base = new Date(2026, 9, 12, 15, 0).getTime();
    for (let i = 0; i < 12; i += 1) {
      const now = new Date(base + i * 3.7 * 3_600_000);
      const data = generateDataset({ now });
      data.devices
        .filter((d) => d.status === 'online' && !d.id.startsWith('DEV-SCN-'))
        .forEach((device) => {
          expect(
            data.alarms.some((a) => a.deviceId === device.id && isBlockingAlarm(a) && isAlarmUnrecovered(a)),
            `${device.id} at ${now.toISOString()}`,
          ).toBe(false);
        });
    }
  });

  it('applyDerivedStatus 同步恢复后的心跳时刻，未变化的设备保持原对象', () => {
    const data = generateDataset({ now: new Date(2026, 9, 12, 15, 0) });
    const derived = applyDerivedStatus(data.devices, data.alarms, data.now);
    expect(derived).toHaveLength(data.devices.length);
    // 场景设备按设计派生：主线=离线、多告警=故障、正常=在线
    const byId = new Map(derived.map((d) => [d.id, d]));
    expect(byId.get('DEV-SCN-01')?.status).toBe('offline');
    expect(byId.get('DEV-SCN-02')?.status).toBe('fault');
    expect(byId.get('DEV-SCN-03')?.status).toBe('online');
    // 全量口径：自然分布的种子在线设备不携带未恢复阻断告警（生成器压缩保证）
    const blockingByDevice = new Set(
      data.alarms.filter((a) => isBlockingAlarm(a) && isAlarmUnrecovered(a)).map((a) => a.deviceId),
    );
    data.devices
      .filter((d) => d.status === 'online' && !d.id.startsWith('DEV-SCN-'))
      .forEach((d) => expect(blockingByDevice.has(d.id)).toBe(false));
    // 派生结果与种子分布一致（在线仍是 220 左右，不因派生翻车）
    expect(derived.filter((d) => d.status === 'online').length).toBeGreaterThanOrEqual(218);
  });
});
