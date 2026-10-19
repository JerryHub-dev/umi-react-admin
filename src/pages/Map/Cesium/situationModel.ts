/**
 * 海域综合态势模型（Situation 页数据层）：纯 TS、确定性种子随机、不依赖 Cesium。
 * 三个关注区（核心/警戒/监视）+ 六类编成模板（警戒舰群 / 空中巡逻 / 商船航线 /
 * 渔船群 / 慢速徘徊嫌疑船 / 直飞目标），按模板生成 60+ 目标：
 * 每个目标带军标所需的维度与归属（2525C SIDC 在 symbols.ts 组装）、AIS/航班元数据、
 * 往返航线与航速；越界事件由 simulateEvents 用同一条采样轨道离线算出，
 * 页面按回放时刻推送进事件流。
 */
import { distanceKm } from '@/utils/MapCompute/geodesy';

/* ------------------------------ 确定性随机 ------------------------------ */

/** mulberry32：小而快的种子 PRNG，同种子同序列（刷新不变，演示可复现） */
const mulberry32 = (initial: number) => {
  let seed = initial | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* ------------------------------ 关注区 ------------------------------ */

export type ZoneId = 'core' | 'warning' | 'watch';

export interface Zone {
  id: ZoneId;
  polygon: [number, number][];
  /** 墙体/填充 css（palette.ACCENT_CSS.zone 族） */
  css: string;
  peakAlpha: number;
}

const WATCH: [number, number][] = [
  [122.1, 36.6],
  [126.2, 36.3],
  [126.6, 30.4],
  [122.5, 29.9],
];

/** 多边形向质心收缩（层间同心感）：k=1 原样，k=0 全部塌到质心 */
const shrink = (polygon: [number, number][], k: number): [number, number][] => {
  const c = polygon.reduce((acc, p) => [acc[0] + p[0] / polygon.length, acc[1] + p[1] / polygon.length], [0, 0]);
  return polygon.map((p) => [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k] as [number, number]);
};

export const ZONES: Zone[] = [
  { id: 'watch', polygon: WATCH, css: '#1e90ff', peakAlpha: 0.1 },
  { id: 'warning', polygon: shrink(WATCH, 0.78), css: '#faad14', peakAlpha: 0.14 },
  { id: 'core', polygon: shrink(WATCH, 0.52), css: '#ff4d4f', peakAlpha: 0.18 },
];

/* ------------------------------ 编成模板 ------------------------------ */

export type Affiliation = 'friend' | 'neutral' | 'unknown' | 'suspect' | 'hostile';
export type TrackKind = 'ship' | 'aircraft';
export type GroupKey = 'escort' | 'patrol' | 'merchant' | 'fisher' | 'loiter' | 'transit';

export interface TargetGroup {
  key: GroupKey;
  kind: TrackKind;
  affiliation: Affiliation;
}

export const GROUPS: Record<GroupKey, TargetGroup> = {
  escort: { key: 'escort', kind: 'ship', affiliation: 'friend' },
  patrol: { key: 'patrol', kind: 'aircraft', affiliation: 'friend' },
  merchant: { key: 'merchant', kind: 'ship', affiliation: 'neutral' },
  fisher: { key: 'fisher', kind: 'ship', affiliation: 'neutral' },
  loiter: { key: 'loiter', kind: 'ship', affiliation: 'suspect' },
  transit: { key: 'transit', kind: 'aircraft', affiliation: 'unknown' },
};

const VESSEL_TYPES = ['Container', 'Bulk Carrier', 'Tanker', 'General Cargo', 'Ro-Ro'];
const AIR_TYPES = ['A320', 'B738', 'A321', 'B77W'];

export interface SituationTarget {
  id: string;
  group: GroupKey;
  kind: TrackKind;
  affiliation: Affiliation;
  /** 航速（节）与巡航高度（米，船为 0） */
  knots: number;
  altitude: number;
  /** 往返航线（度） */
  route: [number, number][];
  /** AIS / 航班元数据（详情卡直读）。飞行高度层不单列：详情卡由 altitude 换算 FL，避免两处口径不一 */
  meta: { mmsi?: string; callsign?: string; vessel?: string; flight?: string; airType?: string; lengthM?: number };
}

const KNOT_KMH = 1.852;

/** 往返闭环：waypoints 正向 + 反向（去掉首尾重复），循环播放的轨迹源 */
const loopOf = (route: [number, number][]) => [...route, ...route.slice(0, -1).reverse()];

/** 航线上按地速推进 t 秒后的位置（线性插值；与页面 SampledPositionProperty 同一条采样源） */
export const positionAt = (target: SituationTarget, seconds: number): [number, number] => {
  const loop = loopOf(target.route);
  // 每段耗时 = 段长 km / (节 × 1.852) 小时 → 秒
  const legs: number[] = [];
  let total = 0;
  for (let i = 0; i < loop.length; i++) {
    const next = loop[(i + 1) % loop.length];
    const leg = (distanceKm(loop[i], next) / (target.knots * KNOT_KMH)) * 3600;
    legs.push(leg);
    total += leg;
  }
  let t = seconds % total;
  for (let i = 0; i < legs.length; i++) {
    if (t <= legs[i]) {
      const next = loop[(i + 1) % loop.length];
      const k = legs[i] === 0 ? 0 : t / legs[i];
      return [loop[i][0] + (next[0] - loop[i][0]) * k, loop[i][1] + (next[1] - loop[i][1]) * k];
    }
    t -= legs[i];
  }
  return loop[0];
};

/* ------------------------------ 舰队生成 ------------------------------ */

const jitter = (rand: () => number, spread: number) => (rand() - 0.5) * 2 * spread;

/**
 * 生成整支演示舰队（确定性）。
 * 数量口径：警戒舰 9（3 群 × 3）、空中巡逻 8（4 双机）、商船航线 16、渔船 18、
 * 徘徊嫌疑船 3、不明直飞 5 → 59 目标 + 2 条直插核心区的敌意航线（事件流的来源）= 61。
 */
export const buildFleet = (seed = 20261018): SituationTarget[] => {
  const rand = mulberry32(seed);
  const targets: SituationTarget[] = [];
  const mmsi = (i: number) => `412${String(200000 + Math.floor(rand() * 699999) + i).padStart(6, '0')}`;
  const push = (t: SituationTarget) => targets.push(t);

  // 警戒舰群：3 个环形站位群（core 区外围三角）
  const anchors: [number, number][] = [
    [123.4, 34.2],
    [125.1, 32.8],
    [123.9, 31.6],
  ];
  anchors.forEach((anchor, g) => {
    for (let i = 0; i < 3; i++) {
      const base: [number, number] = [anchor[0] + jitter(rand, 0.5), anchor[1] + jitter(rand, 0.4)];
      push({
        id: `V-E${g + 1}${i + 1}`,
        group: 'escort',
        kind: 'ship',
        affiliation: 'friend',
        knots: 12 + Math.round(rand() * 8),
        altitude: 0,
        route: [base, [base[0] + 0.5 + jitter(rand, 0.2), base[1] + 0.35], [base[0] + 0.2, base[1] - 0.45]],
        meta: {
          mmsi: mmsi(targets.length),
          callsign: `ESC-${g + 1}${i + 1}`,
          vessel: 'Frigate',
          lengthM: 134 + Math.round(rand() * 20),
        },
      });
    }
  });

  // 空中巡逻：4 条跑道形往返线（race-track）
  const patrolAnchors: [number, number][] = [
    [123.6, 35.4],
    [125.4, 33.6],
    [124.2, 31.4],
    [122.9, 33.8],
  ];
  patrolAnchors.forEach((anchor, g) => {
    for (let i = 0; i < 2; i++) {
      const y = anchor[1] + jitter(rand, 0.3) + i * 0.22;
      push({
        id: `A-P${g + 1}${i + 1}`,
        group: 'patrol',
        kind: 'aircraft',
        affiliation: 'friend',
        knots: 360 + Math.round(rand() * 60),
        altitude: 7600 + Math.round(rand() * 1800),
        route: [
          [anchor[0] - 1.1, y],
          [anchor[0] + 1.1, y + jitter(rand, 0.15)],
        ],
        meta: { flight: `PAT-${g + 1}${i + 1}`, airType: 'P-8A' },
      });
    }
  });

  // 商船航线：两条对穿主航道各 8 艘
  const lanes: [number, number][][] = [
    [
      [122.4, 35.9],
      [123.5, 34.4],
      [124.4, 32.9],
      [125.1, 31.3],
    ],
    [
      [126.2, 35.3],
      [125.0, 33.9],
      [123.8, 32.6],
      [122.7, 31.2],
    ],
  ];
  lanes.forEach((lane, laneIdx) => {
    for (let i = 0; i < 8; i++) {
      const offset = jitter(rand, 0.18);
      const route = lane.map((p) => [p[0] + offset, p[1] + jitter(rand, 0.12)] as [number, number]);
      push({
        id: `V-M${laneIdx + 1}${i + 1}`,
        group: 'merchant',
        kind: 'ship',
        affiliation: 'neutral',
        knots: 11 + Math.round(rand() * 9),
        altitude: 0,
        route,
        meta: {
          mmsi: mmsi(targets.length),
          callsign: `MRV${100 + i + laneIdx * 8}`,
          vessel: VESSEL_TYPES[Math.floor(rand() * VESSEL_TYPES.length)],
          lengthM: 180 + Math.round(rand() * 140),
        },
      });
    }
  });

  // 渔船群：watch 区东南角两簇
  for (let i = 0; i < 18; i++) {
    const cluster = i < 10 ? [123.3, 30.9] : [124.6, 31.9];
    const base: [number, number] = [cluster[0] + jitter(rand, 0.45), cluster[1] + jitter(rand, 0.35)];
    push({
      id: `V-F${i + 1}`,
      group: 'fisher',
      kind: 'ship',
      affiliation: 'neutral',
      knots: 6 + Math.round(rand() * 5),
      altitude: 0,
      route: [base, [base[0] + 0.18 + jitter(rand, 0.08), base[1] + 0.12], [base[0] - 0.05, base[1] + 0.2]],
      meta: {
        mmsi: mmsi(targets.length),
        callsign: `FV-${i + 1}`,
        vessel: 'Trawler',
        lengthM: 45 + Math.round(rand() * 35),
      },
    });
  }

  // 徘徊嫌疑船：warning 区边缘慢速绕圈
  for (let i = 0; i < 3; i++) {
    const c: [number, number] = [125.3 - i * 0.9, 33.6 + i * 0.5];
    push({
      id: `V-S${i + 1}`,
      group: 'loiter',
      kind: 'ship',
      affiliation: 'suspect',
      knots: 7 + Math.round(rand() * 3),
      altitude: 0,
      route: [
        [c[0] - 0.28, c[1]],
        [c[0], c[1] + 0.22],
        [c[0] + 0.28, c[1] - 0.05],
        [c[0], c[1] - 0.25],
      ],
      meta: { mmsi: mmsi(targets.length), callsign: `UNK-${i + 1}`, vessel: 'Trawler (dark)', lengthM: 58 },
    });
  }

  // 不明直飞航空器：横穿 watch 区的高空航线
  for (let i = 0; i < 5; i++) {
    const lat = 31.5 + i * 1.1;
    push({
      id: `A-T${i + 1}`,
      group: 'transit',
      kind: 'aircraft',
      affiliation: 'unknown',
      knots: 400 + Math.round(rand() * 70),
      altitude: 8900 + Math.round(rand() * 1500),
      route: [
        [121.4 + jitter(rand, 0.3), lat],
        [127.2 + jitter(rand, 0.3), lat + jitter(rand, 0.5)],
      ],
      meta: { flight: `TR${500 + i}`, airType: AIR_TYPES[Math.floor(rand() * AIR_TYPES.length)] },
    });
  }

  // 敌意直插：两条由外向核心区逼近的航线（事件流的主角）
  push({
    id: 'V-X1',
    group: 'loiter',
    kind: 'ship',
    affiliation: 'hostile',
    knots: 16,
    altitude: 0,
    route: [
      [126.4, 36.2],
      [125.2, 34.8],
      [124.4, 33.6],
      [124.1, 32.8],
    ],
    meta: { mmsi: mmsi(900), callsign: '—', vessel: 'Corvette', lengthM: 88 },
  });
  push({
    id: 'A-X1',
    group: 'transit',
    kind: 'aircraft',
    affiliation: 'hostile',
    knots: 440,
    altitude: 9400,
    route: [
      [128.1, 35.8],
      [125.8, 34.2],
      [124.2, 32.9],
    ],
    meta: { flight: 'UNK-77', airType: '—' },
  });

  return targets;
};

/* ------------------------------ 越界事件 ------------------------------ */

export interface ZoneEvent {
  id: string;
  targetId: string;
  /** 事件发生时刻（秒，自回放起点） */
  atSec: number;
  zone: ZoneId;
  kind: 'enter' | 'exit';
  /** 告警级：hostile/suspect 进 warning 以上，或任意目标进 core */
  alert: boolean;
}

const pointInPolygon = (p: [number, number], polygon: [number, number][]) => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/** 离线推演越界事件：对每个目标按 stepSec 采样（与地图上同一 positionAt），
 *  记录进出各层的时刻。回放时按 atSec 依序推送，效果即「实时事件流」。 */
export const simulateEvents = (targets: SituationTarget[], durationSec = 12 * 3600, stepSec = 180): ZoneEvent[] => {
  const events: ZoneEvent[] = [];
  targets.forEach((target) => {
    ZONES.forEach((zone) => {
      let inside = pointInPolygon(positionAt(target, 0), zone.polygon);
      for (let t = stepSec; t <= durationSec; t += stepSec) {
        const now = pointInPolygon(positionAt(target, t), zone.polygon);
        if (now !== inside) {
          events.push({
            id: `${target.id}-${zone.id}-${now ? 'in' : 'out'}-${t}`,
            targetId: target.id,
            atSec: t,
            zone: zone.id,
            kind: now ? 'enter' : 'exit',
            alert:
              now &&
              (zone.id === 'core' ||
                ((target.affiliation === 'hostile' || target.affiliation === 'suspect') && zone.id === 'warning')),
          });
          inside = now;
        }
      }
    });
  });
  return events.sort((a, b) => a.atSec - b.atSec);
};

export const DURATION_SECONDS = 12 * 3600;
