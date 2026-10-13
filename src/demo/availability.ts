/**
 * 设备可用性与告警恢复的统一业务规则（审查 F07/F08 的修复核心）。
 *
 * 所有页面（设备列表/详情、地图、工作台 KPI、报表）都通过这里的派生函数读设备状态，
 * 不允许各页面自行猜测。规则本身可测试（availability.test.ts）：
 *
 * - 阻断性告警（影响设备可用性）：类型 ∈ {offline, power, link, temperature} 且级别 ∈ {critical, major}。
 *   干扰/信号类告警与 minor/info 级别影响的是信号质量，不阻断设备在线。
 * - 未恢复 = 活动告警，或已转工单但关联工单尚未完成（转单本身不等于恢复）。
 * - 设备状态派生：存在未恢复的 offline 型阻断告警 → 离线；存在其他未恢复阻断告警 → 故障；否则在线。
 *   同一设备多条阻断告警时，全部满足恢复条件后才回到在线（处理一条不提前上线）。
 */
import type { Alarm, Device, DeviceStatus } from '@/services/types';

const BLOCKING_TYPES = new Set(['offline', 'power', 'link', 'temperature']);

/** 阻断性告警的类型 + 级别组合（生成器压缩自然分布时也用同一口径） */
export const isBlockingKind = (type: Alarm['type'], level: Alarm['level']) =>
  BLOCKING_TYPES.has(type) && (level === 'critical' || level === 'major');

/** 阻断性告警：影响设备可用性的告警（见文件头规则） */
export const isBlockingAlarm = (alarm: Alarm) => isBlockingKind(alarm.type, alarm.level);

/** 未恢复：活动，或已转工单但尚未恢复（工单完成/退回时由服务端同步 recoveredAt） */
export const isAlarmUnrecovered = (alarm: Alarm) =>
  alarm.status === 'active' || (alarm.status === 'ticketed' && !alarm.recoveredAt);

/** 是否已恢复（自动恢复 / 误报关闭 / 转单后工单完成） */
export const isAlarmRecovered = (alarm: Alarm) => !isAlarmUnrecovered(alarm);

/** 按设备的未恢复阻断告警集合推导设备状态 */
export const deriveDeviceStatus = (deviceId: string, alarms: Alarm[]): DeviceStatus => {
  const blocking = alarms.filter(
    (alarm) => alarm.deviceId === deviceId && isBlockingAlarm(alarm) && isAlarmUnrecovered(alarm),
  );
  if (blocking.some((alarm) => alarm.type === 'offline')) return 'offline';
  if (blocking.length > 0) return 'fault';
  return 'online';
};

/**
 * 为一批设备输出派生后的状态（读路径统一入口：设备接口、地图、工作台、报表都用它）。
 * lastHeartbeatAt 随派生状态同步：种子离线/故障设备恢复后，心跳展示为演示当前时间。
 */
export const applyDerivedStatus = <T extends Device>(devices: T[], alarms: Alarm[], now: string): T[] =>
  devices.map((device) => {
    const derived = deriveDeviceStatus(device.id, alarms);
    if (derived === device.status) return device;
    return {
      ...device,
      status: derived,
      lastHeartbeatAt: derived === 'online' ? now : device.lastHeartbeatAt,
    };
  });
