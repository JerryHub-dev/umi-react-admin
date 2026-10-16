/**
 * 跟随指针的粒子光环 —— 纯计算部分（不碰 DOM，便于单测；绘制在同目录 index.tsx）。
 *
 * 观感参照 antigravity.google 首屏的鼠标跟随粒子，按拆解出的规律自行实现，未复用其代码：
 * 1. 全屏铺一层带抖动的网格粒子，每个粒子是一段圆头短线（胶囊），沿径向取向；
 * 2. 光环中心以指数缓动追随指针；粒子按到光环边缘的距离落在一条高斯包络里，越近越长、越粗、越亮；
 * 3. 水面感来自四件事叠加：
 *    - 浪峰：包络里有一列向外传播的正弦波，浪峰经过时粒子变亮并被托起，落下后回到原位；
 *    - 软边：边缘半径随方位角由几组慢速谐波起伏，光环不是死板的正圆；
 *    - 扰动能量：光环中心移动越快能量越高 —— 浪更急更高、光环更大、运动反方向拖出尾迹；静止后慢慢平息；
 *    - 惯性：每个粒子的位移挂在一根欠阻尼弹簧上（滞后、轻微回弹），亮度快起慢落，扫过之处留下余晖。
 * 4. 颜色按方位角在一圈渐变色上取值，整圈缓慢旋转，浪峰处再轻微偏色。
 *
 * 性能：每帧一次 O(n) 计算，再按「色相 × 强度档」分桶，每个桶一条 path、一次 stroke / fill，
 * 1080p 下两千来个粒子也只有几十次绘制调用。
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
const PUSH = 12;
const MIN_LEN = 0.6;
const MAX_LEN = 9;
/** 包络宽度（相对半径） */
const ENVELOPE = 0.36;
/** 浪长（相对半径）：约三道浪同时出现在包络里 */
const WAVELENGTH = 0.42;
/** 弹簧刚度与阻尼：固有频率约 1Hz、阻尼比 0.45，跟得上又带一点回弹 */
const SPRING_K = 38;
const SPRING_C = 2 * 0.45 * Math.sqrt(SPRING_K);
/** 亮度的起落速率（1/s）：快起慢落，扫过的地方留一道余晖 */
const GLOW_RISE = 9;
const GLOW_FALL = 2.2;
/** 光环中心速度达到它时扰动能量饱和（px/s） */
const ENERGY_SPEED = 900;
/** 入场：光环从小半径像一圈涟漪扩散到正常大小所用的秒数 */
export const INTRO_SECONDS = 1.6;
/** 指针与键盘静止这么久（ms）后降到 30 帧 */
export const IDLE_MS = 8000;
/** 安静模式（用户正在输入）下整体压暗的比例 */
export const QUIET_DIM = 0.4;

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
  /** 弹簧状态：相对网格原位的位移与速度 */
  ox: Float32Array;
  oy: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
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

/** 光环中心的运动状态 */
export interface Motion {
  x: number;
  y: number;
  /** 平滑后的中心速度（px/s） */
  vx: number;
  vy: number;
  /** 扰动能量 0..1：移动越快越高，静止后缓慢平息 */
  energy: number;
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
  vx: new Float32Array(count),
  vy: new Float32Array(count),
  glow: new Float32Array(count),
});

export const createGroups = (count: number): Groups => ({
  counts: new Uint32Array(HUES * LEVELS),
  starts: new Uint32Array(HUES * LEVELS),
  order: new Uint32Array(count),
  cursor: new Uint32Array(HUES * LEVELS),
});

export const createMotion = (x: number, y: number): Motion => ({ x, y, vx: 0, vy: 0, energy: 0 });

/** 光环半径随视口缩放，并夹在可读范围内 */
export const ringRadius = (width: number, height: number) =>
  Math.min(340, Math.max(120, Math.min(width, height) * 0.3));

/**
 * 软边：方位角 theta 处的边缘半径。几组不同阶数、不同转速的谐波叠加，轮廓缓慢起伏（静止时约 ±11%）；
 * 有扰动能量时运动反方向（heading + π）再拉长最多 12%，像船尾的尾迹。
 */
export const edgeRadius = (theta: number, t: number, base: number, energy: number, heading: number) =>
  base *
  (1 +
    0.05 * Math.sin(3 * theta + 0.6 * t) +
    0.035 * Math.sin(5 * theta - 0.9 * t + 1.3) +
    0.025 * Math.sin(2 * theta + 0.35 * t + 2.1) -
    0.12 * energy * Math.cos(theta - heading));

/** 包络：以边缘为中心的高斯（1 = 正好在边缘上） */
export const envelope = (offset: number, radius: number) => Math.exp(-((offset / (radius * ENVELOPE)) ** 2));

/** 浪的相位 k·u − ωt（k 为波数，ω 为角频率）：相位恒定处 u 随 t 增大，即浪峰向外推进；搅动越强浪越急 */
export const wavePhase = (offset: number, radius: number, t: number, energy: number) =>
  (TAU / (radius * WAVELENGTH)) * offset - (1.6 + 1.2 * energy) * t;

/** 边缘附近的亮度：包络 × 浪（浪峰更亮）；搅动越强，浪峰与浪谷的反差越大 */
export const ringIntensity = (env: number, crest: number, energy: number) => {
  const amp = 0.35 + 0.35 * energy;
  const lift = 0.5 + 0.5 * crest;
  return env * (1 - amp + amp * lift * lift);
};

/** 外围淡点的衰减：以中心为原点的宽高斯，决定光环能「照亮」多远（约两倍半径外不再绘制） */
export const haloFalloff = (distance: number, radius: number) => Math.exp(-((distance / (radius * 1.8)) ** 2));

/** 帧率无关的指数缓动：rate 越大越跟手 */
export const follow = (current: number, target: number, dt: number, rate: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

/**
 * 推进光环中心一步：缓动追向目标，并由中心速度更新扰动能量（快起慢落）。dt <= 0 时不变。
 * rate 决定跟手程度：跟指针时大，自行游走时小。
 */
export const stepMotion = (motion: Motion, targetX: number, targetY: number, dt: number, rate: number) => {
  if (dt <= 0) return motion;
  const px = motion.x;
  const py = motion.y;
  motion.x = follow(px, targetX, dt, rate);
  motion.y = follow(py, targetY, dt, rate);
  motion.vx = follow(motion.vx, (motion.x - px) / dt, dt, 6);
  motion.vy = follow(motion.vy, (motion.y - py) / dt, dt, 6);
  const target = Math.min(1, Math.hypot(motion.vx, motion.vy) / ENERGY_SPEED);
  motion.energy = follow(motion.energy, target, dt, target > motion.energy ? 5 : 0.8);
  return motion;
};

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

/** 入场半径系数：从 0.3 以缓出曲线涨到 1，配合亮度从零升起，看起来像一圈涟漪从中心荡开 */
export const introScale = (t: number) => {
  const p = Math.min(1, Math.max(0, t / INTRO_SECONDS));
  return 0.3 + 0.7 * (1 - (1 - p) ** 3);
};

/**
 * 两帧之间的最小间隔（ms）：窗口失焦（用户在看别的窗口）降到 20 帧，长时间无操作降到 30 帧，其余满帧。
 * 慢速游走在 30 帧下看不出差别，笔记本停在登录页时风扇与电量都更省。
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
 * 推进一帧：更新每个粒子的弹簧与亮度，写出线段端点与绘制桶，返回本帧可见粒子数。
 * t 为累计秒数，dt 为本帧时长；dt <= 0 时直接落到目标状态（静态画面、减少动态效果）。
 */
export const computeFrame = (layout: Layout, frame: Frame, motion: Motion, radius: number, t: number, dt: number) => {
  const { x, y, phase, count } = layout;
  const { seg, bucket, ox, oy, vx, vy, glow } = frame;
  const { energy } = motion;
  const snap = dt <= 0;
  const heading = Math.atan2(motion.vy, motion.vx);
  // 整圈缓慢呼吸，被搅动时再胀大一些
  const base = radius * (1 + 0.03 * Math.sin(t * 0.8) + 0.08 * energy);
  // 浪被托起的高度（px）；平静时一道浪约 4 秒，搅动时约 2 秒（见 wavePhase）
  const bob = 4 + 6 * energy;
  const spin = t * 0.035;
  // 全场一道很慢的斜向涌浪，只影响外围淡点的明暗
  const swellK = TAU / 900;
  const rise = snap ? 1 : 1 - Math.exp(-GLOW_RISE * dt);
  const fall = snap ? 1 : 1 - Math.exp(-GLOW_FALL * dt);
  let visible = 0;
  for (let i = 0; i < count; i++) {
    const dx = x[i] - motion.x;
    const dy = y[i] - motion.y;
    const d = Math.hypot(dx, dy) || 1e-6;
    const theta = Math.atan2(dy, dx);
    const u = d - edgeRadius(theta, t, base, energy, heading);
    const env = envelope(u, radius);
    const wave = wavePhase(u, radius, t, energy);
    const crest = Math.sin(wave);
    const ring = ringIntensity(env, crest, energy);
    const swell = 0.7 + 0.3 * Math.sin(swellK * (0.8 * x[i] + 0.6 * y[i]) - 0.5 * t);
    const target = Math.max(ring, haloFalloff(d, base) * HALO_FLOOR * swell);
    const g = glow[i] + (target - glow[i]) * (target > glow[i] ? rise : fall);
    glow[i] = g;

    // 位移目标：沿径向推开，浪峰经过时再被托起一点
    const ux = dx / d;
    const uy = dy / d;
    const push = env * (PUSH + crest * bob);
    const tx = ux * push;
    const ty = uy * push;
    if (snap) {
      ox[i] = tx;
      oy[i] = ty;
      vx[i] = 0;
      vy[i] = 0;
    } else {
      // 半隐式欧拉：先更新速度再更新位移，dt ≤ 0.05 时稳定
      vx[i] += (SPRING_K * (tx - ox[i]) - SPRING_C * vx[i]) * dt;
      vy[i] += (SPRING_K * (ty - oy[i]) - SPRING_C * vy[i]) * dt;
      ox[i] += vx[i] * dt;
      oy[i] += vy[i] * dt;
    }

    if (g < VISIBLE_MIN) {
      bucket[i] = -1;
      continue;
    }
    visible++;
    const cx = x[i] + ox[i];
    const cy = y[i] + oy[i];
    const level = Math.min(LEVELS - 1, Math.floor(g ** 0.85 * LEVELS));
    const half = (MIN_LEN + (level / (LEVELS - 1)) * (MAX_LEN - MIN_LEN)) / 2;
    // 随浪的坡度轻轻摇摆，再叠一点各自的小幅晃动
    const tilt = Math.cos(wave) * 0.22 * env + Math.sin(t * 0.9 + phase[i]) * 0.06;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    const ax = (ux * cos - uy * sin) * half;
    const ay = (ux * sin + uy * cos) * half;
    const o = i * 4;
    seg[o] = cx - ax;
    seg[o + 1] = cy - ay;
    seg[o + 2] = cx + ax;
    seg[o + 3] = cy + ay;
    // 方位角决定色相；离边缘越远、越靠浪峰，色相再偏移一点
    let hue = theta / TAU + spin + (1 - env) * 0.18 + crest * env * 0.02;
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
