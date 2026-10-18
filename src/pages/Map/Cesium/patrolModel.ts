/**
 * 巡检任务模型（Trajectory 页的数据层）：程序生成，不依赖静态 JSON。
 * 8 个航路点经 Catmull-Rom 平滑成 240 个采样点（约 2 秒一个采样点），
 * 高度缓起伏（1500m 巡检高度 ± 地形感噪声），覆盖质量按「距沿线基站的传播衰减」
 * 分好/中/差三档——与场强页（fieldModel.ts）同一套物理口径。
 */
import { distanceKm } from '@/utils/MapCompute/geodesy';

export interface PatrolSample {
  lng: number;
  lat: number;
  alt: number;
  /** 覆盖质量 0..1（颜色编码用） */
  quality: number;
}

/** 沿线地面基站（覆盖质量的参考源） */
export const BASE_STATIONS: [number, number][] = [
  [116.48, 30.52],
  [116.92, 30.28],
];

/** 航路点（任务计划）：围绕演示区域一圈的巡视线 */
const WAYPOINTS: [number, number][] = [
  [116.32, 30.28],
  [116.55, 30.22],
  [116.82, 30.3],
  [117.02, 30.46],
  [116.98, 30.68],
  [116.72, 30.78],
  [116.45, 30.72],
  [116.28, 30.5],
];

/** Catmull-Rom 插值：过点平滑，闭合航线的首尾各补一个相邻点 */
const catmull = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t ** 2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3);

const routePoint = (points: [number, number][], i: number, t: number): [number, number] => {
  const n = points.length;
  const p0 = points[(i - 1 + n) % n];
  const p1 = points[i % n];
  const p2 = points[(i + 1) % n];
  const p3 = points[(i + 2) % n];
  return [catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)];
};

/** 覆盖质量：到最近基站的距离 → 传播衰减（45km 内良好，70km 外差） */
export const coverageQuality = (lng: number, lat: number) => {
  const nearest = Math.min(...BASE_STATIONS.map((s) => distanceKm(s, [lng, lat])));
  return Math.min(1, Math.max(0, (70 - nearest) / 45));
};

export const qualityColor = (quality: number) => (quality > 0.66 ? '#52c41a' : quality > 0.33 ? '#fadb14' : '#f5222d');

/** 生成整条闭合巡检线（确定性：无随机成分，刷新不变） */
export const buildPatrolRoute = (samples = 240): PatrolSample[] => {
  const out: PatrolSample[] = [];
  for (let k = 0; k < samples; k++) {
    const position = k / samples;
    const [lng, lat] = routePoint(
      WAYPOINTS,
      Math.floor(position * WAYPOINTS.length),
      (position * WAYPOINTS.length) % 1,
    );
    out.push({
      lng,
      lat,
      alt: 1500 + 260 * Math.sin(position * Math.PI * 4) + 140 * Math.sin(position * Math.PI * 9 + 1.2),
      quality: coverageQuality(lng, lat),
    });
  }
  return out;
};

/** 用户手绘航线 → 采样（与内置任务同一数据结构）；高度与质量同样按位置计算 */
export const sampleRoute = (waypoints: { longitude: number; latitude: number }[], samples = 220): PatrolSample[] => {
  if (waypoints.length < 2) return [];
  const pts = waypoints.map((p) => [p.longitude, p.latitude] as [number, number]);
  const open: [number, number][] = [pts[0], ...pts, pts[pts.length - 1]];
  const out: PatrolSample[] = [];
  const segments = pts.length - 1;
  for (let k = 0; k < samples; k++) {
    const position = k / (samples - 1);
    const seg = Math.min(segments - 1, Math.floor(position * segments));
    const t = position * segments - seg;
    const i = seg + 1;
    const [lng, lat] = [
      catmull(open[i - 1][0], open[i][0], open[i + 1][0], open[i + 2][0], t),
      catmull(open[i - 1][1], open[i][1], open[i + 1][1], open[i + 2][1], t),
    ];
    out.push({ lng, lat, alt: 1500 + 200 * Math.sin(position * Math.PI * 3), quality: coverageQuality(lng, lat) });
  }
  return out;
};

/** 回放节奏：每秒推进 2 个采样点（240 点整圈 2 分钟） */
export const SAMPLES_PER_SECOND = 2;
