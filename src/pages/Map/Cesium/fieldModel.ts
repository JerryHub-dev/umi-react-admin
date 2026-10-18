/**
 * 场强仿真模型（Heatmap 页的数据层）：不依赖任何静态 JSON，
 * 4 台发射机 + 距离衰减 + 时间缓变的多径增益，确定性伪随机保证同参数同结果。
 * 热力图与覆盖壳层共用同一套物理口径：壳层半径就是「等场强面」的反解。
 */
import * as Cesium from 'cesium';

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

/** 地形粗糙度：固定的空间噪声，避免热力图过分平滑 */
const terrainNoise = (lng: number, lat: number) =>
  0.9 + 0.1 * Math.sin(lng * 37.7 + lat * 53.3) * Math.cos(lng * 11.3 - lat * 7.9);

/** 第 i 台发射机在 t 秒时刻的增益：多径干涉随时间缓变（热力图「呼吸」的来源） */
const beamGain = (index: number, seconds: number) => 0.75 + 0.25 * Math.sin(seconds * 0.25 + index * 1.7);

const KM_PER_DEGREE = 111;

/** 点到场源的场强贡献（dB 口径的中间量） */
const rawAt = (lng: number, lat: number, seconds: number) => {
  let sum = 0;
  TRANSMITTERS.forEach((tx, i) => {
    const dkm = Math.max(1.2, Math.hypot((lng - tx.lng) * KM_PER_DEGREE, (lat - tx.lat) * KM_PER_DEGREE));
    sum += (tx.power * beamGain(i, seconds)) / ((dkm * dkm) / 100 + 1);
  });
  return sum * terrainNoise(lng, lat);
};

/** 场强（演示 dB 口径，10..98） */
export const fieldStrength = (lng: number, lat: number, seconds: number) =>
  Math.min(98, Math.max(10, 20 + 18 * Math.log10(rawAt(lng, lat, seconds) * 1000)));

/** 覆盖壳层的反解：功率 p 的发射机场强恰为 threshold dB 处的距离（km） */
export const coverageRadiusKm = (power: number, threshold: number) => {
  const raw = 10 ** ((threshold - 20) / 18) / 1000 / power;
  return Math.sqrt(Math.max(1, 100 * (1 / Math.max(raw, 1e-6) - 1)));
};

export const transmitters = (): readonly Transmitter[] => TRANSMITTERS;

/** 网格采样（静态基准场，t=0）：热力 canvas 的采样源 */
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

/** 场强分级色（与图例一致） */
const STOPS: [number, string][] = [
  [25, '#2f54eb'],
  [40, '#52c41a'],
  [60, '#fadb14'],
  [75, '#fa8c16'],
  [Infinity, '#f5222d'],
];
export const strengthColor = (value: number) => STOPS.find(([limit]) => value <= limit)![1];

/**
 * 把场渲染到 canvas 上（热力图核心，社区 heatmap.js + Cesium 的经典做法的自实现版）：
 * 每个采样点画一个径向渐变圆，lighter 叠加出连续的热力分布。
 * canvas 直接作为 ImageMaterialProperty 的贴图，每 200ms 重绘一次即得「动态热力」。
 */
export const renderHeatCanvas = (canvas: HTMLCanvasElement, seconds: number, cols = 110, rows = 72) => {
  const { west, south, east, north } = REGION;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'lighter';
  const rx = canvas.width / (east - west);
  const ry = canvas.height / (north - south);
  const radius = Math.max(10, canvas.width / cols) * 1.4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lng = west + ((c + 0.5) / cols) * (east - west);
      const lat = south + ((r + 0.5) / rows) * (north - south);
      const strength = fieldStrength(lng, lat, seconds);
      const x = (lng - west) * rx;
      const y = canvas.height - (lat - south) * ry;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const css = Cesium.Color.fromCssColorString(strengthColor(strength));
      const alpha = 0.05 + 0.28 * ((strength - 10) / 88);
      gradient.addColorStop(
        0,
        `rgba(${Math.round(css.red * 255)},${Math.round(css.green * 255)},${Math.round(css.blue * 255)},${alpha.toFixed(3)})`,
      );
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
};
