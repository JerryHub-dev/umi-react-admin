/**
 * 演示特效工具库：六页复用的「弹药」——扫描圈、流光材质、目标图标。
 * 全部基于 CallbackProperty（每帧求值），数量级在个位数实体时性能无虞；
 * 数值驱动动画而非 Cesium clock，离线/静态降级时（reduce 动效）由调用方自行不添加。
 */
import * as Cesium from 'cesium';

export interface ScanRingOptions {
  /** 扫描中心（度） */
  lon: number;
  lat: number;
  color?: string;
  /** 最大扫描半径（米） */
  maxRadius?: number;
  /** 一圈扫完的时长（秒） */
  duration?: number;
  /** 环心高度（米），跟随飞行目标时给目标高度 */
  height?: number;
}

/**
 * 雷达扫描圈：半径从内向外扩张、随扩张渐隐，循环往复。
 * 相位必须取自 Cesium 传入的 clock 时间（同一帧内两次求值结果一致）；
 * 用 performance.now() 会让半长/半短轴在相位回绕处取到不同值，触发
 * DeveloperError: semiMajorAxis < semiMinorAxis，渲染循环直接停摆。
 * 两轴共用同一个 CallbackProperty 实例，从根上排除不一致。
 */
export const scanRingMaterial = (color: string, maxRadius: number, duration: number) => {
  const epochMs = performance.now();
  const phaseOf = (time?: Cesium.JulianDate) => {
    const ms = time ? Cesium.JulianDate.toDate(time).getTime() : performance.now();
    return (((ms - epochMs) / 1000) % duration) / duration;
  };
  const base = Cesium.Color.fromCssColorString(color);
  const axis = new Cesium.CallbackProperty((time?: Cesium.JulianDate) => 4_000 + phaseOf(time) * maxRadius, false);
  return {
    semiMajorAxis: axis,
    semiMinorAxis: axis,
    material: new Cesium.ColorMaterialProperty(
      new Cesium.CallbackProperty((time?: Cesium.JulianDate) => base.withAlpha(0.42 * (1 - phaseOf(time))), false),
    ),
  };
};

export const addScanRing = (
  viewer: Cesium.Viewer,
  { lon, lat, color = '#1677ff', maxRadius = 60_000, duration = 3, height = 0 }: ScanRingOptions,
) =>
  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(lon, lat, height),
    ellipse: scanRingMaterial(color, maxRadius, duration),
  });

/** 流光 polyline 材质：比纯色/虚线更有「能量在线路里流动」的观感 */
export const glowMaterial = (css: string, alpha = 0.9) =>
  new Cesium.PolylineGlowMaterialProperty({
    glowPower: 0.28,
    taperPower: 0.6,
    color: Cesium.Color.fromCssColorString(css).withAlpha(alpha),
  });

/** 用 canvas 画目标图标（billboard 用），避免依赖外部图片资源 */
const drawIcon = (kind: 'ship' | 'aircraft', css: string) => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = css;
  if (kind === 'aircraft') {
    // 纸飞机：朝正上，billboard rotation 转航向
    ctx.beginPath();
    ctx.moveTo(32, 4);
    ctx.lineTo(58, 56);
    ctx.lineTo(32, 42);
    ctx.lineTo(6, 56);
    ctx.closePath();
    ctx.fill();
  } else {
    // 船体 + 航向桅杆
    ctx.beginPath();
    ctx.moveTo(10, 38);
    ctx.lineTo(54, 38);
    ctx.lineTo(46, 54);
    ctx.lineTo(18, 54);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(30, 8, 4, 30);
    ctx.beginPath();
    ctx.moveTo(34, 10);
    ctx.lineTo(52, 32);
    ctx.lineTo(34, 32);
    ctx.closePath();
    ctx.fill();
  }
  return canvas.toDataURL();
};

let iconCache: Record<string, string> = {};

/** 目标图标（dataURL，按 kind+颜色缓存）：船/飞机的剪影，配 billboard 使用 */
export const targetIcon = (kind: 'ship' | 'aircraft', css: string) => {
  const key = `${kind}:${css}`;
  iconCache[key] ??= drawIcon(kind, css);
  return iconCache[key];
};
