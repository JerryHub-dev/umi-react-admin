/**
 * 跟随指针的粒子场 —— 纯计算部分（不碰 DOM，便于单测；绘制在同目录 index.tsx）。
 *
 * 观感对齐 antigravity.google 的 MainParticles（three.js GPGPU 原版，2026-10 拆解），未复用其代码：
 * 1. 全屏铺一层带抖动的网格粒子，每个粒子是一段圆头短线（胶囊），沿径向取向；
 * 2. 环心以慢速指数缓动追随指针（≈1.2/s，明显慢半拍的漂浮感）；粒子按到环的距离落在高斯包络里，
 *    越近越长、越粗、越亮；环外是宽高斯衰减的淡点，全场还有一层基础明暗，远处的粒子也隐约可见；
 * 3. 环半径只随时间呼吸（±3~5%），不随指针速度变化；粒子位移沿径向向外推开，指数回归、无回弹；
 *    位置上叠一层细微的高频涟漪，亮度快起慢落，扫过之处留下余晖；
 * 4. 颜色是三色补丁的噪声混合（对齐参考站 shader 的 noiseColor），随「家位置」缓慢流动——
 *    暗色主题 蓝蓝黑（黑色粒子沉进底色形成暗补丁），亮色主题 蓝/红/黄；没有色环、不随方位角变色。
 *
 * 性能：每帧一次 O(n) 计算，再按「补丁色 × 强度档」分桶，每个桶一条 path、一次 stroke / fill，
 * 1080p 下两千来个粒子也只有几十次绘制调用。
 */

export const TAU = Math.PI * 2;

/** 强度分档数：档位决定线宽、长度与不透明度 */
export const LEVELS = 6;
/** 补丁渐变取样数 */
export const HUES = 48;
/** 最低的这几档几乎是一个点：画成小方块填充，比圆头描边便宜得多（软件渲染下差距明显） */
export const DOT_LEVELS = 2;
/** 粒子总数上限：大屏改为放大间距，避免 4K 外接屏上每帧上万个粒子 */
const MAX_PARTICLES = 2200;

/** 低于此可见度的粒子不画（环远处） */
const VISIBLE_MIN = 0.05;
/** 环外淡点相对环带的亮度上限 */
const HALO_FLOOR = 0.24;
/** 全场基础明暗：参考站的 ambient 项，让整片纹理隐约可见（暗斑随 shim 起伏） */
const AMBIENT_BASE = 0.06;
const AMBIENT_SHIM = 0.05;
/** 环带上的粒子沿径向被推开的距离（px） */
const PUSH = 12;
const MIN_LEN = 0.6;
const MAX_LEN = 9;
/** 包络宽度（相对半径） */
const ENVELOPE = 0.34;
/** 位移的指数回归速率（1/s）：对齐参考站的逐帧衰减，无弹簧回弹 */
const RELAX = 8;
/** 亮度的起落速率（1/s）：快起慢落，扫过的地方留一道余晖 */
const GLOW_RISE = 9;
const GLOW_FALL = 2.2;
/** 高频位置涟漪：波数与幅度都很小，只是让环带微微「呼吸出行走的纹理」 */
const RIPPLE_K = 0.07;
const RIPPLE_AMP = 1.6;
/** 入场：环从小半径像一圈涟漪扩散到正常大小所用的秒数 */
export const INTRO_SECONDS = 1.6;
/** 指针与键盘静止这么久（ms）后降到 30 帧 */
export const IDLE_MS = 8000;
/** 安静模式（用户正在输入）下整体压暗的比例 */
export const QUIET_DIM = 0.4;

/** 三色补丁（对齐参考站 shader 的 colorControls）：暗色主题 蓝蓝黑，黑色粒子沉进底色形成暗补丁 */
const STOPS_DARK: [number, number, number][] = [
  [113, 137, 255], // #7189ff
  [48, 116, 249], // #3074f9
  [0, 0, 0], // #000000
];
/** 亮色主题：蓝 / 红 / 黄 */
const STOPS_LIGHT: [number, number, number][] = [
  [44, 100, 237], // #2c64ed
  [248, 66, 66], // #f84242
  [255, 207, 3], // #ffcf03
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
  /** 所属绘制桶（patch * LEVELS + level），-1 表示本帧不可见 */
  bucket: Int16Array;
  /** 平滑后的径向位移（相对网格原位，指数回归无回弹） */
  ox: Float32Array;
  oy: Float32Array;
  /** 平滑后的亮度（0..1） */
  glow: Float32Array;
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

/** 环心的运动状态：只有位置——参考站没有速度响应，环的形态不随指针快慢变化 */
export interface Motion {
  x: number;
  y: number;
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
  ox: new Float32Array(count),
  oy: new Float32Array(count),
  glow: new Float32Array(count),
});

export const createGroups = (count: number): Groups => ({
  counts: new Uint32Array(HUES * LEVELS),
  starts: new Uint32Array(HUES * LEVELS),
  order: new Uint32Array(count),
  cursor: new Uint32Array(HUES * LEVELS),
});

export const createMotion = (x: number, y: number): Motion => ({ x, y });

/** 环半径随视口缩放，并夹在可读范围内 */
export const ringRadius = (width: number, height: number) =>
  Math.min(340, Math.max(120, Math.min(width, height) * 0.3));

/**
 * 环半径随时间的呼吸（对齐参考站 uRingRadius 的更新公式）：±3~5%，两个不同频率的谐波叠加。
 * 与旧版不同，不再随指针速度胀大，也没有软边起伏——参考站的环是正圆 + 呼吸。
 */
export const ringBase = (radius: number, t: number) => radius * (1 + 0.03 * Math.sin(t) + 0.02 * Math.cos(3 * t));

/** 包络：以环带为中心的高斯（1 = 正好在环上） */
export const envelope = (offset: number, radius: number) => Math.exp(-((offset / (radius * ENVELOPE)) ** 2));

/** 外围淡点的衰减：以环心为原点的宽高斯，决定环能「照亮」多远（约两倍半径外基本只剩基础明暗） */
export const haloFalloff = (distance: number, radius: number) => Math.exp(-((distance / (radius * 1.8)) ** 2));

/** 帧率无关的指数缓动：rate 越大越跟手 */
export const follow = (current: number, target: number, dt: number, rate: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

/**
 * 推进环心一步。rate 决定跟手程度：参考站的逐帧 lerp 0.02（60fps 下有效速率 ≈1.2/s），
 * 指针态取 1.3 保持「慢半拍」的漂浮感，空闲游走更慢一些。
 * dt <= 0 时不变。
 */
export const stepMotion = (motion: Motion, targetX: number, targetY: number, dt: number, rate: number) => {
  if (dt <= 0) return motion;
  motion.x = follow(motion.x, targetX, dt, rate);
  motion.y = follow(motion.y, targetY, dt, rate);
  return motion;
};

/**
 * 没有指针（首屏、触屏、指针移出窗口）时环心沿一条缓慢的利萨如曲线游走（等价参考站的噪声游走）。
 * 窄屏上登录框几乎占满视口，环改在顶部标题一带游走，不然整圈都藏在面板后面
 */
export const idleFocus = (t: number, width: number, height: number): [number, number] => {
  const narrow = width < 640;
  return [
    width * (0.5 + (narrow ? 0.25 : 0.2) * Math.sin(t * 0.21)),
    height * (narrow ? 0.16 + 0.05 * Math.sin(t * 0.29 + 1) : 0.48 + 0.14 * Math.sin(t * 0.29 + 1)),
  ];
};

/** 入场半径系数：从 0.3 以缓出曲线涨到 1，配合亮度从零升起，看起来像一圈涟漪从中心荡开 */
export const introScale = (t: number) => {
  const p = Math.min(1, Math.max(0, t / INTRO_SECONDS));
  return 0.3 + 0.7 * (1 - (1 - p) ** 3);
};

/**
 * 两帧之间的最小间隔（ms）：窗口失焦（用户在看别的窗口）降到 20 帧，长时间无操作降到 30 帧，其余满帧。
 * 慢速游走在 30 帧下看不出差别，笔记本停在登录页时风扇与电量都更省。
 * （参考站另有「任意输入后暂停渲染 600ms」保护输入延迟；这里用安静模式压暗代替，登录表单场景更合适。）
 */
export const frameGap = (blurred: boolean, idleMs: number) => (blurred ? 50 : idleMs > IDLE_MS ? 33 : 0);

/** 某一强度档的线宽与不透明度；暗色底上同档更亮一些 */
export const levelStyle = (level: number, dark: boolean) => {
  const v = level / (LEVELS - 1);
  return {
    width: 1.2 + v * 2.2,
    alpha: (dark ? 0.32 : 0.24) + v * (dark ? 0.68 : 0.76),
  };
};

/** 把三色补丁插值成 steps 个 canvas 可用的颜色串（首尾不接环，是渐变的两端） */
export const buildPalette = (kind: 'dark' | 'light' = 'dark', steps = HUES) => {
  const stops = kind === 'dark' ? STOPS_DARK : STOPS_LIGHT;
  return Array.from({ length: steps }, (_, i) => {
    const pos = (i / (steps - 1)) * (stops.length - 1);
    const k = Math.floor(pos);
    const f = pos - k;
    const a = stops[k];
    const b = stops[k + 1] ?? stops[k];
    const mix = (j: number) => Math.round(a[j] + (b[j] - a[j]) * f);
    return `rgb(${mix(0)},${mix(1)},${mix(2)})`;
  });
};

/**
 * 推进一帧：更新每个粒子的位移与亮度，写出线段端点与绘制桶，返回本帧可见粒子数。
 * t 为累计秒数，dt 为本帧时长；dt <= 0 时直接落到目标状态（静态画面、减少动态效果）。
 */
export const computeFrame = (layout: Layout, frame: Frame, motion: Motion, radius: number, t: number, dt: number) => {
  const { x, y, phase, count } = layout;
  const { seg, bucket, ox, oy, glow } = frame;
  const snap = dt <= 0;
  const base = ringBase(radius, t);
  const rise = snap ? 1 : 1 - Math.exp(-GLOW_RISE * dt);
  const fall = snap ? 1 : 1 - Math.exp(-GLOW_FALL * dt);
  const relax = snap ? 1 : 1 - Math.exp(-RELAX * dt);
  let visible = 0;
  for (let i = 0; i < count; i++) {
    const dx = x[i] - motion.x;
    const dy = y[i] - motion.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    const env = envelope(d - base, radius);
    // 场上慢速明暗斑（参考站的中尺度噪声）：补丁明暗与基础可见度共用它
    const shim = 0.5 + 0.5 * Math.sin(x[i] * 0.02 + t * 0.5 + phase[i]);
    const target = Math.max(
      env * (0.82 + 0.18 * shim),
      haloFalloff(d, base) * HALO_FLOOR,
      AMBIENT_BASE + AMBIENT_SHIM * shim,
    );
    const g = glow[i] + (target - glow[i]) * (target > glow[i] ? rise : fall);
    glow[i] = g;

    // 位移目标：沿径向向外推开；实际位移指数回归，无回弹（对齐参考站）
    const ux = dx / d;
    const uy = dy / d;
    const push = env * PUSH;
    ox[i] += (ux * push - ox[i]) * relax;
    oy[i] += (uy * push - oy[i]) * relax;

    if (g < VISIBLE_MIN) {
      bucket[i] = -1;
      continue;
    }
    visible++;
    // 高频位置涟漪：波数与幅度都很小，环带附近才有（对齐参考站 disp 的 sin 项）
    const rippleX = Math.sin(x[i] * RIPPLE_K + t * 2) * RIPPLE_AMP * env;
    const rippleY = Math.cos(y[i] * RIPPLE_K + t * 1.6) * RIPPLE_AMP * env;
    const cx = x[i] + ox[i] + rippleX;
    const cy = y[i] + oy[i] + rippleY;
    const level = Math.min(LEVELS - 1, Math.floor(g ** 0.85 * LEVELS));
    const half = (MIN_LEN + (level / (LEVELS - 1)) * (MAX_LEN - MIN_LEN)) / 2;
    // 取向沿径向，再叠一点各自的小幅晃动
    const tilt = Math.sin(t * 0.9 + phase[i]) * 0.08;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    const ax = (ux * cos - uy * sin) * half;
    const ay = (ux * sin + uy * cos) * half;
    const o = i * 4;
    seg[o] = cx - ax;
    seg[o + 1] = cy - ay;
    seg[o + 2] = cx + ax;
    seg[o + 3] = cy + ay;
    // 补丁混色索引：按「家位置」的低频噪声取样，随时间缓慢流动（参考站 noiseColor 的近似）
    const patch = 0.5 + 0.5 * Math.sin(x[i] * 0.006 + y[i] * 0.004 + t * 0.15 + phase[i] * 0.7);
    bucket[i] = Math.min(HUES - 1, Math.floor(patch * HUES)) * LEVELS + level;
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
