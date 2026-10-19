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

/* ------------------------------ 态势特效（重构新增） ------------------------------ */

/** 呼吸围栏材质：墙体透明度随时间正弦起伏（电子围栏的「警戒呼吸」） */
export const breathingWall = (css: string, peakAlpha = 0.35, period = 3.2) => {
  const base = Cesium.Color.fromCssColorString(css);
  const epoch = performance.now();
  return new Cesium.ColorMaterialProperty(
    new Cesium.CallbackProperty((time?: Cesium.JulianDate) => {
      const ms = time ? Cesium.JulianDate.toDate(time).getTime() : performance.now();
      const phase = (((ms - epoch) / 1000) % period) / period;
      return base.withAlpha(peakAlpha * (0.35 + 0.65 * Math.sin(phase * Math.PI * 2) ** 2));
    }, false),
  );
};

/** 选中脉冲圈：固定半径、透明度脉冲（选中站点/目标的高亮，与扩张扫描圈区分） */
export const pulseRing = (css: string, radius: number, period = 1.6) => {
  const base = Cesium.Color.fromCssColorString(css);
  const epoch = performance.now();
  const phaseOf = (time?: Cesium.JulianDate) => {
    const ms = time ? Cesium.JulianDate.toDate(time).getTime() : performance.now();
    return (((ms - epoch) / 1000) % period) / period;
  };
  return {
    semiMajorAxis: radius,
    semiMinorAxis: radius,
    material: new Cesium.ColorMaterialProperty(
      new Cesium.CallbackProperty((time?: Cesium.JulianDate) => base.withAlpha(0.5 * (1 - phaseOf(time))), false),
    ),
  };
};

/** 泛光后处理（发光业务图层的「能量感」）：中端机型可关，返回是否支持 */
export const setBloom = (viewer: Cesium.Viewer, enabled: boolean, strength = 0.35) => {
  const bloom = viewer.scene.postProcessStages.bloom;
  if (!bloom) return false;
  bloom.enabled = enabled;
  bloom.uniforms.glowOnly = false;
  bloom.uniforms.delta = 0.9;
  bloom.uniforms.sigma = 3.78;
  bloom.uniforms.stepSize = 5;
  // strength 挂在 uniforms.brightness（0..1 映射到 0.05..0.6，避免过曝）
  bloom.uniforms.brightness = 0.05 + strength * 0.55;
  return true;
};

/** 统一标签样式：六场景的 entity label 一套口径（字号/衬底/描边），避免各页各配 */
export const tagLabel = (
  options: {
    font?: string;
    offset?: [number, number];
    fillCss?: string;
    background?: string;
  } = {},
) => ({
  font: options.font ?? '12px sans-serif',
  pixelOffset: new Cesium.Cartesian2(...(options.offset ?? [0, -22])),
  fillColor: Cesium.Color.fromCssColorString(options.fillCss ?? '#ffffff'),
  showBackground: true,
  backgroundColor: Cesium.Color.fromCssColorString(options.background ?? 'rgba(6,16,27,0.72)'),
  backgroundPadding: new Cesium.Cartesian2(5, 3),
  distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1_200_000),
});

/** 由位置属性求航向（弧度，顺时针自北）→ billboard rotation（逆时针）：图标始终指着前进方向 */
export const headingRotation = (viewer: Cesium.Viewer, position: Cesium.PositionProperty, sampleSeconds = 180) =>
  new Cesium.CallbackProperty(() => {
    const now = viewer.clock.currentTime;
    const p1 = position.getValue(now);
    const p2 = position.getValue(Cesium.JulianDate.addSeconds(now, sampleSeconds, new Cesium.JulianDate()));
    if (!p1 || !p2) return 0;
    const c1 = viewer.scene.globe.ellipsoid.cartesianToCartographic(p1);
    const c2 = viewer.scene.globe.ellipsoid.cartesianToCartographic(p2);
    const heading = Math.atan2(
      (c2.longitude - c1.longitude) * Math.cos((c1.latitude + c2.latitude) / 2),
      c2.latitude - c1.latitude,
    );
    return -heading;
  }, false);
