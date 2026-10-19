/**
 * 场强仿真模型（Heatmap 页数据层）：纯 TS、无 Cesium 依赖（可进 Web Worker）。
 * 4 台发射机 + 距离衰减 + fBm 地形噪声（三个倍频程的值噪声，观感远胜单频 sin）
 * + 时间缓变的多径增益，确定性保证同参数同结果。热力渲染与等值线共用同一网格。
 */

export interface Transmitter {
  id: string;
  lng: number;
  lat: number;
  /** 相对功率（0..1] */
  power: number;
}

export interface FieldSample {
  lng: number;
  lat: number;
  strength: number;
}

/** 演示区域（与旧静态数据同域，便于对比观感） */
export const REGION = { west: 106.2, south: 29.4, east: 107.1, north: 29.95 };

const TRANSMITTERS: Transmitter[] = [
  { id: 'TX-A', lng: 106.42, lat: 29.82, power: 1 },
  { id: 'TX-B', lng: 106.86, lat: 29.72, power: 0.82 },
  { id: 'TX-C', lng: 106.55, lat: 29.52, power: 0.7 },
  { id: 'TX-D', lng: 106.95, lat: 29.9, power: 0.6 },
];

/* ------------------------------ fBm 地形噪声 ------------------------------ */

const fract = (v: number) => v - Math.floor(v);
const hash2 = (x: number, y: number) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
const smoothstep = (t: number) => t * t * (3 - 2 * t);

const valueNoise = (x: number, y: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const tx = smoothstep(x - xi);
  const ty = smoothstep(y - yi);
  const a = hash2(xi, yi);
  const b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1);
  const d = hash2(xi + 1, yi + 1);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
};

/** 三倍频程分形噪声：静态空间起伏（地形粗糙度的代理） */
const fbm = (lng: number, lat: number) => {
  const x = lng * 24;
  const y = lat * 24;
  return (
    0.56 * valueNoise(x, y) +
    0.29 * valueNoise(x * 2.3 + 7, y * 2.1 + 3) +
    0.15 * valueNoise(x * 4.7 + 13, y * 4.3 + 11)
  );
};

const terrainNoise = (lng: number, lat: number) => 0.72 + 0.42 * fbm(lng, lat);

/* ------------------------------ 传播模型 ------------------------------ */

/** 第 i 台发射机在 t 秒时刻的增益：多径干涉随时间缓变（热力图「呼吸」的来源） */
const beamGain = (index: number, seconds: number) => 0.75 + 0.25 * Math.sin(seconds * 0.25 + index * 1.7);

/** 每度纬度的弧长（km）：与 geodesy.ts 的 haversine 同一地球半径（6371.0088 km） */
const KM_PER_DEGREE = (2 * Math.PI * 6371.0088) / 360;

/**
 * 区域尺度（~100 km）的平面距离：等距矩形投影，经度差按两点平均纬度的 cos 缩放。
 * 曾直接按 111 km/度 算经度差，在 ~29.7°N 把东西向距离放大约 15%，热力等值线被横向压扁，
 * 与探针读数（haversine）和覆盖圈（大圆圆）对不上
 */
export const planarDistanceKm = (lng: number, lat: number, lng2: number, lat2: number) => {
  const cosLat = Math.cos((((lat + lat2) / 2) * Math.PI) / 180);
  return Math.hypot((lng - lng2) * KM_PER_DEGREE * cosLat, (lat - lat2) * KM_PER_DEGREE);
};

const rawAt = (lng: number, lat: number, seconds: number, powers?: number[]) => {
  let sum = 0;
  TRANSMITTERS.forEach((tx, i) => {
    const dkm = Math.max(1.2, planarDistanceKm(lng, lat, tx.lng, tx.lat));
    const power = powers?.[i] ?? tx.power;
    sum += (power * beamGain(i, seconds)) / ((dkm * dkm) / 100 + 1);
  });
  return sum * terrainNoise(lng, lat);
};

export const FIELD_MIN = 10;
export const FIELD_MAX = 98;

/** 场强（演示 dB 口径，10..98） */
export const fieldStrength = (lng: number, lat: number, seconds: number, powers?: number[]) =>
  Math.min(FIELD_MAX, Math.max(FIELD_MIN, 20 + 18 * Math.log10(rawAt(lng, lat, seconds, powers) * 1000)));

/** 覆盖壳层的反解：功率 p 的发射机场强恰为 threshold dB 处的距离（km） */
export const coverageRadiusKm = (power: number, threshold: number) => {
  const raw = 10 ** ((threshold - 20) / 18) / 1000 / power;
  return Math.sqrt(Math.max(1, 100 * (1 / Math.max(raw, 1e-6) - 1)));
};

export const transmitters = (): readonly Transmitter[] => TRANSMITTERS;

/** 网格采样（行优先，row 0 = 北）：热力 canvas / 等值线 / Worker 的统一数据源 */
export const gridValues = (cols: number, rows: number, seconds: number, powers?: number[]) => {
  const values = new Float32Array(cols * rows);
  const latSpan = REGION.north - REGION.south;
  const lngSpan = REGION.east - REGION.west;
  for (let r = 0; r < rows; r++) {
    const lat = REGION.north - ((r + 0.5) / rows) * latSpan;
    for (let c = 0; c < cols; c++) {
      const lng = REGION.west + ((c + 0.5) / cols) * lngSpan;
      values[r * cols + c] = fieldStrength(lng, lat, seconds, powers);
    }
  }
  return values;
};

/** 旧接口保留（少量低分辨率场景/测试用）：静态基准场 t=0 */
export const gridSamples = (cols = 110, rows = 72): FieldSample[] => {
  const out: FieldSample[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lng = REGION.west + ((c + 0.5) / cols) * (REGION.east - REGION.west);
      const lat = REGION.south + ((r + 0.5) / rows) * (REGION.north - REGION.south);
      out.push({ lng, lat, strength: fieldStrength(lng, lat, 0) });
    }
  }
  return out;
};
