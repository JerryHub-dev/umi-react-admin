/**
 * 六个 Cesium 场景共用的「态势色板」：一次定义、处处引用，
 * 替代此前每页各配各色的散乱状态。取值锚定 antd 语义色（暗色底图上校验过对比度），
 * 军标 affiliation 色遵循 MIL-STD-2525 惯例（友蓝 / 中绿 / 不明黄 / 嫌疑橙 / 敌红）。
 */

/** 目标归属（与 milsymbol 的 affiliation 对应） */
export type Affiliation = 'friend' | 'neutral' | 'unknown' | 'suspect' | 'hostile';

export const AFFILIATION_CSS: Record<Affiliation, string> = {
  friend: '#1677ff',
  neutral: '#52c41a',
  unknown: '#faad14',
  suspect: '#fa8c16',
  hostile: '#ff4d4f',
};

/** 能力包络（Direction 页三种能力，沿用既有语义色） */
export const CAPABILITY_CSS = {
  intercept: '#ff4d4f',
  location: '#1677ff',
  demodulation: '#52c41a',
} as const;

/** 覆盖质量三档（Trajectory / GeoHash 共用） */
export const QUALITY_CSS = { good: '#52c41a', fair: '#fadb14', poor: '#f5222d' } as const;

/** 场景强调色：走廊/航线/选中高亮等「能量」元素 */
export const ACCENT_CSS = {
  corridor: '#36cfc9',
  route: '#fadb14',
  selection: '#faad14',
  zone: '#1e90ff',
  alert: '#ff4d4f',
} as const;

/** 暗色底图上文字/描边的通用色 */
export const INK_CSS = {
  primary: '#ffffff',
  secondary: 'rgba(255,255,255,0.72)',
  outline: 'rgba(255,255,255,0.55)',
} as const;

/** 数值色带（turbo 截断版）：密度/场强这类连续量的统一映射，避免五档色块的断裂感 */
export const RAMP_CSS = [
  '#2c7bb6',
  '#00a6ca',
  '#00ccbc',
  '#90eb9d',
  '#ffff8c',
  '#f9d057',
  '#f29e2e',
  '#e76818',
  '#d7191c',
];

/** 连续量 → 色带插值（0..1），返回 css 颜色 */
export const rampColor = (ratio: number) => {
  const t = Math.min(1, Math.max(0, ratio)) * (RAMP_CSS.length - 1);
  const i = Math.floor(t);
  if (i >= RAMP_CSS.length - 1) return RAMP_CSS[RAMP_CSS.length - 1];
  const frac = t - i;
  const parse = (css: string) => {
    const n = parseInt(css.slice(1), 16);
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
  };
  const a = parse(RAMP_CSS[i]);
  const b = parse(RAMP_CSS[i + 1]);
  const mix = a.map((v, k) => Math.round(v + (b[k] - v) * frac));
  return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
};

/** 色带 css 渐变（图例条用） */
export const rampGradientCss = () => `linear-gradient(90deg, ${RAMP_CSS.join(', ')})`;
