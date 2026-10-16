/**
 * 跟随指针的粒子光环 —— 纯计算部分（不碰 DOM，便于单测；绘制在同目录 index.tsx）。
 *
 * 观感参照 antigravity.google 首屏的鼠标跟随粒子，按拆解出的规律自行实现，未复用其代码：
 * 1. 全屏铺一层带抖动的网格粒子，每个粒子是一段圆头短线（胶囊）；
 * 2. 光环中心以指数缓动追随指针，粒子按到中心的距离落在一圈高斯环带上：
 *    越贴近环带越长、越粗、越不透明，并沿径向被推开一点；环外与环内只剩极淡的小点，再远直接不画；
 * 3. 胶囊沿径向取向（带随相位的轻微摆动），颜色按方位角在一圈渐变色上取值，整圈缓慢旋转。
 *
 * 性能：每帧只做一次 O(n) 计算，再按「色相 × 强度档」分桶，每个桶一条 path、一次 stroke，
 * 1080p 下约三千个粒子也只有几十次绘制调用。
 */

export const TAU = Math.PI * 2;

/** 强度分档数：档位决定线宽、长度与不透明度 */
export const LEVELS = 6;
/** 色环取样数 */
export const HUES = 48;
/** 最低的这几档几乎是一个点：画成小方块填充，比圆头描边便宜得多（软件渲染下差距明显） */
export const DOT_LEVELS = 2;
/** 粒子总数上限：大屏改为放大间距，避免 4K 外接屏上每帧上万个粒子 */
const MAX_PARTICLES = 2200;

/** 低于此可见度的粒子不画（光环远处） */
const VISIBLE_MIN = 0.05;
/** 环外淡点相对环带的亮度上限 */
const HALO_FLOOR = 0.24;
/** 环带上的粒子沿径向被推开的距离（px） */
const PUSH = 14;
const MIN_LEN = 0.6;
const MAX_LEN = 9;

/** 品牌蓝起步的循环色环（首尾相接，插值时回到起点） */
const STOPS: [number, number, number][] = [
  [22, 119, 255], // 蓝（与主色同源）
  [114, 46, 209], // 紫
  [235, 47, 150], // 洋红
  [245, 34, 45], // 红
  [250, 140, 22], // 橙
  [250, 173, 20], // 琥珀
  [19, 194, 194], // 青
];

export interface Layout {
  count: number;
  x: Float32Array;
  y: Float32Array;
  phase: Float32Array;
}

export interface Frame {
  /** 每个粒子一条线段 x1, y1, x2, y2 */
  seg: Float32Array;
  /** 所属绘制桶（hue * LEVELS + level），-1 表示本帧不可见 */
  bucket: Int16Array;
}

export interface Groups {
  /** 每个桶的粒子数 */
  counts: Uint32Array;
  /** 每个桶在 order 中的起点 */
  starts: Uint32Array;
  /** 按桶排好的粒子下标 */
  order: Uint32Array;
  /** 归组时的写指针（预分配，避免每帧分配） */
  cursor: Uint32Array;
}

/** 确定性伪随机（mulberry32）：同一尺寸的布局每次一致，刷新页面不会「换一张脸」 */
export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** 窄屏粒子稀一些（手机上同样的密度既费电又显得脏）；大屏按总数上限放大间距 */
export const spacingFor = (width: number, height: number) =>
  Math.max(width < 640 ? 30 : 26, Math.sqrt((width * height) / MAX_PARTICLES));

/** 带抖动的网格布局，四周各多铺一格，被推开或摆动时边缘不会露空 */
export const layoutParticles = (width: number, height: number, spacing: number, seed = 7): Layout => {
  const cols = Math.ceil(width / spacing) + 2;
  const rows = Math.ceil(height / spacing) + 2;
  const count = cols * rows;
  const rand = mulberry32(seed);
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const phase = new Float32Array(count);
  for (let r = 0, i = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++, i++) {
      x[i] = (c - 1 + (rand() - 0.5) * 0.8) * spacing;
      y[i] = (r - 1 + (rand() - 0.5) * 0.8) * spacing;
      phase[i] = rand() * TAU;
    }
  }
  return { count, x, y, phase };
};

export const createFrame = (count: number): Frame => ({
  seg: new Float32Array(count * 4),
  bucket: new Int16Array(count),
});

export const createGroups = (count: number): Groups => ({
  counts: new Uint32Array(HUES * LEVELS),
  starts: new Uint32Array(HUES * LEVELS),
  order: new Uint32Array(count),
  cursor: new Uint32Array(HUES * LEVELS),
});

/** 光环半径随视口缩放，并夹在可读范围内 */
export const ringRadius = (width: number, height: number) =>
  Math.min(340, Math.max(120, Math.min(width, height) * 0.3));

/** 环带强度：以半径为中心的高斯，宽度与半径成比例（1 = 正好在环上） */
export const ringFalloff = (distance: number, radius: number) =>
  Math.exp(-(((distance - radius) / (radius * 0.32)) ** 2));

/** 外围淡点的衰减：以中心为原点的宽高斯，决定光环能「照亮」多远（约两倍半径外不再绘制） */
export const haloFalloff = (distance: number, radius: number) => Math.exp(-((distance / (radius * 1.8)) ** 2));

/** 帧率无关的指数缓动：rate 越大越跟手 */
export const follow = (current: number, target: number, dt: number, rate: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

/**
 * 没有指针（首屏、触屏、指针移出窗口）时光环沿一条缓慢的利萨如曲线游走。
 * 窄屏上登录框几乎占满视口，光环改在顶部标题一带游走，不然整圈都藏在面板后面
 */
export const idleFocus = (t: number, width: number, height: number): [number, number] => {
  const narrow = width < 640;
  return [
    width * (0.5 + (narrow ? 0.25 : 0.2) * Math.sin(t * 0.21)),
    height * (narrow ? 0.16 + 0.05 * Math.sin(t * 0.29 + 1) : 0.48 + 0.14 * Math.sin(t * 0.29 + 1)),
  ];
};

/** 某一强度档的线宽与不透明度；暗色底上同档更亮一些 */
export const levelStyle = (level: number, dark: boolean) => {
  const v = level / (LEVELS - 1);
  return {
    width: 1.2 + v * 2.2,
    alpha: (dark ? 0.32 : 0.24) + v * (dark ? 0.68 : 0.76),
  };
};

/** 把循环色环插值成 steps 个 canvas 可用的颜色串 */
export const buildPalette = (steps = HUES) =>
  Array.from({ length: steps }, (_, i) => {
    const pos = (i / steps) * STOPS.length;
    const k = Math.floor(pos);
    const f = pos - k;
    const a = STOPS[k % STOPS.length];
    const b = STOPS[(k + 1) % STOPS.length];
    const mix = (j: number) => Math.round(a[j] + (b[j] - a[j]) * f);
    return `rgb(${mix(0)},${mix(1)},${mix(2)})`;
  });

/**
 * 计算一帧：每个粒子的线段端点与所属绘制桶。返回本帧可见粒子数。
 * (fx, fy) 为光环中心，t 为秒。
 */
export const computeFrame = (layout: Layout, frame: Frame, fx: number, fy: number, radius: number, t: number) => {
  const { x, y, phase, count } = layout;
  const { seg, bucket } = frame;
  // 环带缓慢呼吸，色环缓慢旋转
  const r = radius * (1 + 0.04 * Math.sin(t * 1.1));
  const spin = t * 0.035;
  let visible = 0;
  for (let i = 0; i < count; i++) {
    const dx = x[i] - fx;
    const dy = y[i] - fy;
    const d = Math.hypot(dx, dy) || 1e-6;
    const ring = ringFalloff(d, r);
    const v = Math.max(ring, haloFalloff(d, r) * HALO_FLOOR);
    if (v < VISIBLE_MIN) {
      bucket[i] = -1;
      continue;
    }
    visible++;
    const ux = dx / d;
    const uy = dy / d;
    const ph = phase[i];
    // 沿径向推开，环带上的粒子再随相位轻微起伏，整圈看起来在「呼吸」而不是僵硬平移
    const push = ring * (PUSH + Math.sin(t * 1.7 + ph) * 3);
    const cx = x[i] + ux * push;
    const cy = y[i] + uy * push;
    const level = Math.min(LEVELS - 1, Math.floor(v ** 0.85 * LEVELS));
    const half = (MIN_LEN + (level / (LEVELS - 1)) * (MAX_LEN - MIN_LEN)) / 2;
    const tilt = Math.sin(t * 0.9 + ph) * 0.2 * ring;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    const ax = (ux * cos - uy * sin) * half;
    const ay = (ux * sin + uy * cos) * half;
    const o = i * 4;
    seg[o] = cx - ax;
    seg[o + 1] = cy - ay;
    seg[o + 2] = cx + ax;
    seg[o + 3] = cy + ay;
    // 方位角决定色相；离环越远色相再偏移一些，环内外不会是同一种颜色
    let hue = Math.atan2(dy, dx) / TAU + spin + (1 - ring) * 0.18;
    hue -= Math.floor(hue);
    bucket[i] = (Math.floor(hue * HUES) % HUES) * LEVELS + level;
  }
  return visible;
};

/** 计数排序：把可见粒子按桶归组，绘制时每个桶只需一次 stroke */
export const groupByBucket = (frame: Frame, count: number, groups: Groups) => {
  const { counts, starts, order, cursor } = groups;
  const { bucket } = frame;
  counts.fill(0);
  for (let i = 0; i < count; i++) {
    if (bucket[i] >= 0) counts[bucket[i]]++;
  }
  let acc = 0;
  for (let b = 0; b < counts.length; b++) {
    starts[b] = acc;
    acc += counts[b];
  }
  cursor.set(starts);
  for (let i = 0; i < count; i++) {
    const b = bucket[i];
    if (b >= 0) order[cursor[b]++] = i;
  }
  return acc;
};
