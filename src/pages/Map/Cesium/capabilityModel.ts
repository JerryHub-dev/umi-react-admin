/**
 * 监测站能力模型（Direction 页的数据层）：程序生成，不依赖静态 JSON。
 * 能力距离 = 基距 × 天线方向性（谐波瓣） × 地形遮蔽（固定方位的山体阴影）
 *          × 传播条件（随时间缓变，包络会「呼吸」）。
 * 另提供绕站飞行的模拟目标与「此刻是否在截获包络内」的判定——
 * 能力不再是一个色块，而是「哪些目标此刻能被截获」的动态事实。
 */
import { destination } from '@/utils/MapCompute/geodesy';

export type Capability = 'intercept' | 'location' | 'demodulation';

export const CAPABILITIES: Capability[] = ['location', 'intercept', 'demodulation'];
export const CAPABILITY_COLOR: Record<Capability, string> = {
  intercept: '#ff4d4f',
  location: '#1677ff',
  demodulation: '#52c41a',
};

/** 监测站（与旧静态数据同址） */
export const STATION = { lng: 116.5166, lat: 30.388 };

/** 基距（km）与方向图谐波：[谐波次数, 增益, 主瓣朝向 rad]——截获最宽、解调最强但最窄 */
const PATTERN: Record<Capability, { base: number; lobes: [number, number, number][] }> = {
  intercept: {
    base: 215,
    lobes: [
      [1, 0.16, 0.4],
      [2, 0.09, 1.9],
    ],
  },
  location: {
    base: 165,
    lobes: [
      [2, 0.2, 0.8],
      [4, 0.11, 3.6],
    ],
  },
  demodulation: {
    base: 122,
    lobes: [
      [1, 0.14, 2.6],
      [3, 0.09, 0.9],
    ],
  },
};

/** 地形遮蔽：固定方位的山体阴影（该方位距离打折） */
const SHADOWS: { center: number; width: number; depth: number }[] = [
  { center: 1.1, width: 0.5, depth: 0.3 },
  { center: 3.9, width: 0.7, depth: 0.22 },
  { center: 5.3, width: 0.4, depth: 0.15 },
];

const directivity = (capability: Capability, azimuth: number) =>
  1 + PATTERN[capability].lobes.reduce((sum, [n, gain, phase]) => sum + gain * Math.cos(n * (azimuth - phase)), 0);

const shadow = (azimuth: number) =>
  SHADOWS.reduce((factor, s) => factor * (1 - s.depth * Math.exp(-(((azimuth - s.center) / s.width) ** 2))), 1);
/** 传播条件：电离层/大气引起的整体缓变（包络「呼吸」的来源） */
const conditions = (seconds: number) => 1 + 0.1 * Math.sin(seconds * 0.18) * Math.cos(seconds * 0.07);

/** 某能力在某方位、某时刻的作用距离（km） */
export const rangeKm = (
  capability: Capability,
  azimuth: number,
  seconds: number,
  effects?: { directivity?: boolean; shadow?: boolean },
) =>
  Math.max(
    35,
    PATTERN[capability].base *
      (effects?.directivity === false ? 1 : directivity(capability, azimuth)) *
      (effects?.shadow === false ? 1 : shadow(azimuth)) *
      conditions(seconds),
  );

/** 能力包络环（经纬度点序列 + 各点距离，供多边形/挤出穹顶/统计用） */
export const envelopeRing = (
  capability: Capability,
  seconds: number,
  steps = 72,
  effects?: { directivity?: boolean; shadow?: boolean },
): { longitude: number; latitude: number; distanceKm: number; azimuth: number }[] =>
  Array.from({ length: steps }, (_, i) => {
    const azimuth = (i / steps) * Math.PI * 2;
    const distanceKm = rangeKm(capability, azimuth, seconds, effects);
    // geodesy.destination 的方位角是「度」
    const [longitude, latitude] = destination(STATION.lng, STATION.lat, (azimuth * 180) / Math.PI, distanceKm);
    return { longitude, latitude, distanceKm, azimuth };
  });

/** 能力统计（图例用） */
export const capabilityStats = (capability: Capability, seconds = 0) => {
  const distances = envelopeRing(capability, seconds).map((p) => p.distanceKm);
  return {
    max: Math.max(...distances),
    min: Math.min(...distances),
    avg: distances.reduce((s, d) => s + d, 0) / distances.length,
  };
};

export interface SimTarget {
  id: string;
  kind: 'aircraft' | 'ship';
  /** 轨道半径（km）与角速度（rad/s，播放倍速下可见） */
  radiusKm: number;
  angularSpeed: number;
  phase: number;
  altitude: number;
}

/** 绕站目标：不同半径/方向/速度，覆盖「包络内外」两种状态 */
export const TARGETS: SimTarget[] = [
  { id: 'T-01', kind: 'aircraft', radiusKm: 88, angularSpeed: 0.02, phase: 0.4, altitude: 7200 },
  { id: 'T-02', kind: 'aircraft', radiusKm: 152, angularSpeed: -0.013, phase: 2.1, altitude: 8800 },
  { id: 'T-03', kind: 'aircraft', radiusKm: 235, angularSpeed: 0.008, phase: 4.4, altitude: 9600 },
  { id: 'T-04', kind: 'ship', radiusKm: 64, angularSpeed: -0.03, phase: 1.2, altitude: 0 },
  { id: 'T-05', kind: 'ship', radiusKm: 121, angularSpeed: 0.018, phase: 3.3, altitude: 0 },
  { id: 'T-06', kind: 'aircraft', radiusKm: 190, angularSpeed: -0.01, phase: 5.5, altitude: 6400 },
];

/** 目标在 t 秒时刻的位置 */
export const targetPosition = (target: SimTarget, seconds: number) => {
  const azimuth = target.phase + target.angularSpeed * seconds;
  const [longitude, latitude] = destination(STATION.lng, STATION.lat, (azimuth * 180) / Math.PI, target.radiusKm);
  return { longitude, latitude, altitude: target.altitude, azimuth };
};

/** 目标此刻是否在截获包络内（判定=距离 ≤ 该方位的截获距离） */
export const isIntercepted = (target: SimTarget, seconds: number) => {
  const position = targetPosition(target, seconds);
  return target.radiusKm <= rangeKm('intercept', position.azimuth, seconds);
};

/** 截获裕量（km）：正=包络内（离边界还有多远），负=包络外（还差多少进入）。
 *  「能力不是色块，而是每个目标的裕量数字」——Direction 页目标面板的实时数据源 */
export const interceptMarginKm = (target: SimTarget, seconds: number) => {
  const position = targetPosition(target, seconds);
  return rangeKm('intercept', position.azimuth, seconds) - target.radiusKm;
};

/** 天线方向图（极坐标图数据）：某能力在各方位的标称作用距离（t=0）。
 *  方位用「度」且显式命名 azimuthDeg——envelopeRing / targetPosition 的 azimuth 是弧度 */
export const polarPattern = (capability: Capability, steps = 72) =>
  Array.from({ length: steps }, (_, i) => {
    const azimuthDeg = (i / steps) * 360;
    return { azimuthDeg, rangeKm: rangeKm(capability, (azimuthDeg * Math.PI) / 180, 0) };
  });

/** 测向波束的扫描角（rad，顺时针，12 秒一圈） */
export const sweepAngle = (seconds: number) => (seconds * (Math.PI * 2)) / 12;

/** 波束扇区（中心角 ± 半张角，度数制的多边形轮廓） */
export const sweepSector = (center: number, halfWidth: number, radiusKm: number, steps = 10) => {
  const arc: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const azimuth = center - halfWidth + (i / steps) * halfWidth * 2;
    const [longitude, latitude] = destination(STATION.lng, STATION.lat, (azimuth * 180) / Math.PI, radiusKm);
    arc.push([longitude, latitude]);
  }
  return [[STATION.lng, STATION.lat] as [number, number], ...arc] as [number, number][];
};
