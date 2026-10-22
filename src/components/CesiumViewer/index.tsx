import { readBuildGlobal } from '@/utils/buildGlobals';
import { useIntl } from '@umijs/max';
import { Alert, Button, Grid, Result, Spin, Tooltip, theme } from 'antd';
import * as Cesium from 'cesium';
import CesiumNavigation from 'cesium-navigation-es6';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import * as mgrsModule from 'mgrs';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import './cesium.css';
import { observeTileFailures } from './tileFailures';

/* mgrs 互操作加固：ESM 入口是命名导出，UMD 构建挂在 default 上（与 milsymbol 同类坑，解法同 symbols.ts）。
   不能写 `import { default as … } from 'mgrs'`：webpack 取的 ESM 入口没有 default 导出，生产构建直接报错 */
const mgrsForward = (position: [number, number], precision: number): string => {
  const ns = mgrsModule as unknown as Record<string, unknown>;
  const fn = (ns.forward ?? (ns.default as Record<string, unknown> | undefined)?.forward) as
    typeof mgrsModule.forward | undefined;
  return typeof fn === 'function' ? fn(position, precision) : '';
};

/** 演示页通用的 Viewer 控件配置：关闭原生动画/时间轴/信息框等（自绘 TimeDeck），保留 2D/3D 切换。
 *  天空与大气保持默认开启（省略该键即启用）：这是 Cesium「旋转的蓝色星球」观感的来源，
 *  关掉后瓦片未覆盖的区域就是一片黑幕 */
const DEMO_VIEWER_OPTIONS: Cesium.Viewer.ConstructorOptions = {
  animation: false,
  infoBox: false,
  sceneModePicker: true,
  selectionIndicator: false,
  timeline: false,
  navigationHelpButton: false,
  navigationInstructionsInitiallyVisible: false,
  shouldAnimate: true,
  vrButton: false,
  baseLayerPicker: false,
};

let configured = false;
/** 是否用 ion 默认影像（需要 token 且安全上下文）；否则用无需凭据的暗色底图 */
export const shouldUseIonImagery = () => {
  const token = readBuildGlobal('CESIUM_ION_TOKEN');
  // localhost 属于安全上下文（window.isSecureContext = true），本地 dev 也能用 ion 影像；
  // http 内网部署（非 localhost）不算安全上下文，仍走免凭据底图
  const secureContext = typeof window === 'undefined' || window.isSecureContext;
  return !!token && secureContext;
};

/** 全局一次：挂 window.Cesium（部分插件依赖）并设置 ion token（未配置时为空串） */
const configureCesium = () => {
  if (configured) return;
  configured = true;
  if (typeof window !== 'undefined' && !window.Cesium) window.Cesium = Cesium;
  Cesium.Ion.defaultAccessToken = readBuildGlobal('CESIUM_ION_TOKEN');
};

/** 暗色底图（CartoDB Dark Matter，OSM 数据的 CDN 分发，无需凭据）：
 *  与站点暗色主题、发光业务图层天然咬合，是「作战台」观感的底座 */
const createDarkLayer = () =>
  new Cesium.ImageryLayer(
    new Cesium.UrlTemplateImageryProvider({
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      subdomains: ['a', 'b', 'c', 'd'],
      credit: '© OpenStreetMap contributors © CARTO',
      maximumLevel: 19,
    }),
  );

/** 「夜航滤镜」OSM：标准 OSM 瓦片 + 影像层调色（压暗/降饱和）。
 *  作为无 token 的默认底图与 ion/carto 失败后的回落层——OSM 直连是被验证
 *  可用性最广的免凭据瓦片源，滤镜保住暗色观感（实测均值亮度 ~40，接近 carto dark）。 */
const createGradedOsmLayer = () => {
  const layer = new Cesium.ImageryLayer(
    new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' }),
  );
  layer.brightness = 0.42;
  layer.contrast = 1.12;
  layer.saturation = 0.55;
  layer.hue = -0.02;
  return layer;
};

/** 高德栅格底图（免 Key 的公共瓦片，CSP 的 *.autonavi.com 已放行）：
 *  无 token 且 OSM/CartoDB 都不可达时的最终兜底（部分内网/代理环境只有高德可达）。
 *  注意高德瓦片是 GCJ-02 坐标系，与 WGS-84 业务图层存在数百米偏移——
 *  只作底图兜底不参与量测，且同样加夜航滤镜保持暗色观感。 */
const createGradedAmapLayer = () => {
  const layer = new Cesium.ImageryLayer(
    new Cesium.UrlTemplateImageryProvider({
      url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      subdomains: ['1', '2', '3', '4'],
      credit: '© AutoNavi (GCJ-02)',
      maximumLevel: 18,
    }),
  );
  layer.brightness = 0.46;
  layer.contrast = 1.1;
  layer.saturation = 0.55;
  return layer;
};

/** 底图可达性探测（含像素校验）：超时/非 200/内容异常都视为不可达。
 *  挂起型网络封锁（DNS 黑洞/防火墙丢包）不会触发 XHR error 事件，等「三次失败」
 *  回落可能要一分钟起——探针把判定压到秒级；像素校验拦截「200 + 水印图」型劫持
 *  （实测存在：HTTP 200 但内容是 API KEY REQUIRED 占位图，res.ok 骗过了纯状态码探测）。 */
const probeTileSane = async (url: string, expectDarkTile: boolean, timeoutMs = 5000): Promise<boolean> => {
  if (typeof AbortController === 'undefined') return false;
  if (expectDarkTile && (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined')) {
    return false; // 无法做像素校验时宁可不升级（保持已验证可用的默认底图）
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) return false;
    if (!expectDarkTile) return true;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(64, 64);
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.drawImage(bitmap, 0, 0, 64, 64);
    const { data } = ctx.getImageData(0, 0, 64, 64);
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const meanLum = sum / (data.length / 4);
    bitmap.close?.();
    // 真·dark_all 瓦片均值亮度 ~40；水印/亮色占位图 >120
    return meanLum < 100;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
};

const CARTO_PROBE_URL = 'https://a.basemaps.cartocdn.com/dark_all/2/1/1.png';
const OSM_PROBE_URL = 'https://tile.openstreetmap.org/2/1/1.png';
const AMAP_PROBE_URL = 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x=1&y=1&z=2';
/** 各底图供应方的瓦片主机：网络层失败只计当前供应方（主机清单与 tileFailures.ts 的 TILE_HOSTS 对齐） */
const PROVIDER_HOSTS: Record<'ion' | 'carto' | 'osm' | 'amap', RegExp> = {
  ion: /\.cesium\.com|\.virtualearth\.net/,
  carto: /basemaps\.cartocdn\.com/,
  osm: /tile\.openstreetmap\.org/,
  amap: /\.autonavi\.com/,
};
const CARTO_SANE_CACHE_KEY = 'cesium:carto:sane';
const OSM_DEAD_CACHE_KEY = 'cesium:osm:dead';

/**
 * 创建演示页 Viewer。WebGL 不可用等初始化失败时返回 null，调用方渲染错误态而不是整块空白。
 * 注意：不要隐藏 cesiumWidget.creditContainer——Cesium ion 与影像/地形数据提供方的条款要求显示署名。
 */
export const createDemoViewer = (container: string | Element, options: Cesium.Viewer.ConstructorOptions = {}) => {
  configureCesium();
  try {
    const ion = shouldUseIonImagery();
    // 有 token（安全上下文）→ ion 影像；否则默认「夜航滤镜」OSM（免凭据、可用性最广），
    // 后台探针校验 carto 暗色瓦片可用时再无损升级（见 useCesiumViewer）
    const baseLayer = ion ? undefined : createGradedOsmLayer();
    const instance = new Cesium.Viewer(container, {
      ...DEMO_VIEWER_OPTIONS,
      geocoder: false,
      ...(baseLayer ? { baseLayer } : {}),
      ...options,
    });
    // 深色「夜海」兜底：瓦片未覆盖/加载中的区域不再是黑幕，而是与暗色底图同族的深海色
    instance.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a1a2f');
    instance.scene.globe.showGroundAtmosphere = true;
    instance.scene.postProcessStages.fxaa.enabled = true;
    if (ion) {
      // ion 真实影像统一调性：略降亮度，让发光图层压得住底图
      const layer = instance.imageryLayers.get(0);
      if (layer) layer.brightness = 0.72;
    }
    return instance;
  } catch (error) {
    console.error('Cesium Viewer init failed:', error);
    return null;
  }
};

export const CesiumInitError = () => {
  const intl = useIntl();
  return (
    <Result
      status="warning"
      title={intl.formatMessage({ id: 'error.webgl.title' })}
      subTitle={intl.formatMessage({ id: 'error.webgl.subTitle' })}
    />
  );
};

type UseCesiumViewerOptions = {
  /** 初始视角 [经度, 纬度, 高度(米)] */
  home?: [number, number, number];
  /** 入场视角的姿态（弧度）；缺省为正俯视。配合 home 组成该页的「定妆镜头」 */
  entry?: { heading?: number; pitch?: number; roll?: number };
  /** 关掉电影感入场（单测/截图等需要确定性视角时用） */
  instantEntry?: boolean;
  viewerOptions?: Cesium.Viewer.ConstructorOptions;
  /** Viewer 创建后执行一次（添加图层、事件等）；返回的函数在销毁前调用 */
  onReady?: (viewer: Cesium.Viewer) => void | (() => void);
};

/**
 * 六个 Cesium 场景共用的生命周期：创建、初始视角、错误态、卸载时销毁（含 onReady 注册的清理）。
 * 底图失败检测 = 引用计数单例（tileFailures.ts，网络层）+ 当前底图层的 provider errorEvent（HTTP 层）：
 * ion/carto 连续失败静默回落 OSM，OSM 不可达再兜底高德，高德也不可达才置 basemapFailed
 * 交给 SceneStage 展示说明与重试。
 */
export const useCesiumViewer = ({
  home = [108, 35, 7_000_000],
  entry,
  instantEntry = false,
  viewerOptions,
  onReady,
}: UseCesiumViewerOptions = {}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);
  const [error, setError] = useState(false);
  /** 底图瓦片连续失败（离线/CSP 拦截/限流）时置位：SceneStage 展示可见说明与重试（F01） */
  const [basemapFailed, setBasemapFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  // home / viewerOptions 只在创建时读一次。调用方常在渲染里写内联对象字面量，若列进依赖会每次渲染
  // 重建 Viewer（连瓦片一起重拉）；放进 ref 后 effect 只需依赖 attempt，读到的仍是本次渲染的最新值。
  const createOptionsRef = useRef({ home, entry, instantEntry, viewerOptions });
  createOptionsRef.current = { home, entry, instantEntry, viewerOptions };

  useEffect(() => {
    if (!containerRef.current) return undefined;
    setBasemapFailed(false);
    const { home: target, entry: entryPose, instantEntry: instant, viewerOptions: options } = createOptionsRef.current;
    const instance = createDemoViewer(containerRef.current, options);
    if (!instance) {
      setError(true);
      return undefined;
    }
    // 电影感入场：先在高处落位，再缓动推近到定妆镜头（高度约 2.6 倍起步，缓入缓出 2.2 秒）
    const destination = Cesium.Cartesian3.fromDegrees(...target);
    const orientation = {
      heading: entryPose?.heading ?? 0,
      pitch: entryPose?.pitch ?? Cesium.Math.toRadians(-90),
      roll: entryPose?.roll ?? 0,
    };
    // dev 诊断：相机落位镜像到舞台 DOM 的 dataset（跨世界可读，视角问题可量化核对）
    const stageEl = containerRef.current;
    const mirrorCamera = () => {
      if (!stageEl || instance.isDestroyed()) return;
      const carto = instance.camera.positionCartographic;
      if (!carto) return; // 测试 mock 相机可能没有该属性
      stageEl.dataset.cesiumCam = `${Cesium.Math.toDegrees(carto.latitude).toFixed(2)},${Cesium.Math.toDegrees(
        carto.longitude,
      ).toFixed(2)},${Math.round(carto.height / 1000)}km`;
      stageEl.dataset.cesiumEntryDone = '1';
    };
    if (instant) {
      instance.camera.setView({ destination, orientation });
      mirrorCamera();
    } else {
      instance.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(target[0], target[1], target[2] * 2.6 + 600_000),
        orientation,
      });
      instance.camera.flyTo({
        destination,
        orientation,
        duration: 2.2,
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      });
    }
    // 相机落位镜像（moveEnd）：入场飞行、页面级 zoomTo/进场镜头、用户拖动后都会刷新
    instance.camera.moveEnd.addEventListener(mirrorCamera);
    /* 底图链路（状态机）：
     * - ion（有 token + 安全上下文）：失败 3 次 → 静默回落「夜航滤镜」OSM
     * - osm-graded（默认）：carto 探针（像素校验 + 会话缓存）通过后无损升级原生 carto 暗色；
     *   OSM 探针不可达或失败 3 次 → 探测高德，可达则换「夜航滤镜」高德，不可达才置 basemapFailed
     * - carto（升级后）：失败 3 次 → 静默回落 osm-graded
     * - amap（终极兜底）：失败 3 次 → 置 basemapFailed（最后防线） */
    let tileFailures = 0;
    let provider: 'ion' | 'carto' | 'osm' | 'amap' = shouldUseIonImagery() ? 'ion' : 'osm';
    // dev 诊断手柄：控制台读 window.__cesiumStage；同时镜像到舞台 DOM 的 dataset（跨世界可读）
    const debug: {
      provider: 'ion' | 'carto' | 'osm' | 'amap';
      probes: Record<string, boolean>;
      tileFailures: number;
      swaps: string[];
      entryDone: boolean;
    } = { provider, probes: {}, tileFailures: 0, swaps: [], entryDone: instant };
    const mirrorDebug = () => {
      if (stageEl) {
        stageEl.dataset.cesiumProvider = debug.provider;
        stageEl.dataset.cesiumSwaps = debug.swaps.join(',') || undefined;
        stageEl.dataset.cesiumTileFailures = String(debug.tileFailures);
      }
    };
    if (process.env.NODE_ENV === 'development') {
      (window as unknown as Record<string, unknown>).__cesiumStage = debug;
    }
    mirrorDebug();
    /* 瓦片失败的两路信号汇入同一个状态机（onTileFailure）：
     * - 全局 fetch/XHR 观察（tileFailures.ts）：网络层失败（离线、CSP 拦截、连接被重置），带 URL；
     *   只计当前底图供应方的主机，换层后旧层在途请求的失败不污染新层的计数
     * - 当前底图层 imageryProvider.errorEvent：HTTP 层失败（429 限流、403、5xx），XHR 的 error 事件看不到它们。
     *   网络层失败（无状态码）两路都会报，这里跳过以免重复计数。注意 ImageryLayer 自身的 errorEvent
     *   只在 provider 异步创建失败时触发，不报瓦片失败。换层时监听随层迁移 */
    let amapProbing = false;
    let amapUnreachable = false;
    let detachProviderErrors: (() => void) | undefined;
    // 状态机依赖下方的换层函数，而换层又要给新层挂监听：先占位，定义完换层后再赋值（监听调用时读取当前绑定）
    let onTileFailure: () => void = () => undefined;
    const watchProviderErrors = (layer: Cesium.ImageryLayer | undefined) => {
      detachProviderErrors?.();
      detachProviderErrors = layer?.imageryProvider?.errorEvent?.addEventListener?.(
        (tileError: Cesium.TileProviderError) => {
          const status = (tileError?.error as { statusCode?: number } | undefined)?.statusCode;
          if (typeof status === 'number' && status > 0) onTileFailure();
        },
      );
    };
    const swapBaseLayer = (reason: string, layer: Cesium.ImageryLayer) => {
      tileFailures = 0;
      debug.swaps.push(reason);
      mirrorDebug();
      try {
        instance.imageryLayers.remove(instance.imageryLayers.get(0), true);
        instance.imageryLayers.add(layer, 0);
        watchProviderErrors(layer);
      } catch {
        setBasemapFailed(true);
      }
    };
    const swapToGradedOsm = (reason: string) => {
      provider = 'osm';
      debug.provider = provider;
      swapBaseLayer(reason, createGradedOsmLayer());
    };
    const swapToCarto = (reason: string) => {
      provider = 'carto';
      debug.provider = provider;
      swapBaseLayer(reason, createDarkLayer());
    };
    const swapToAmap = (reason: string) => {
      provider = 'amap';
      debug.provider = provider;
      swapBaseLayer(reason, createGradedAmapLayer());
    };
    /** 终极兜底：探测高德瓦片，可用则切换，不可用才亮「底图失败」告警。
     *  两个分支都只在仍停留在 osm 时生效：探针在途期间 carto 探针可能已升级成功，此时 OSM/高德
     *  不可达并不影响正在显示的底图（「OSM、高德被墙 + carto 可用」的环境曾因此每页都亮横幅） */
    const tryAmapFallback = (reason: string) => {
      // 连续失败会反复触发：同一时刻只留一个探针，已判定不可达后不再重复探测
      if (amapUnreachable) {
        if (provider === 'osm') setBasemapFailed(true);
        return;
      }
      if (amapProbing) return;
      amapProbing = true;
      void probeTileSane(AMAP_PROBE_URL, false).then((amapOk) => {
        amapProbing = false;
        amapUnreachable = !amapOk;
        debug.probes.amap = amapOk;
        if (instance.isDestroyed() || provider !== 'osm') return;
        if (amapOk) swapToAmap(reason);
        else setBasemapFailed(true);
      });
    };
    onTileFailure = () => {
      if (instance.isDestroyed()) return;
      tileFailures += 1;
      debug.tileFailures = tileFailures;
      mirrorDebug();
      if (tileFailures < 3) return;
      if (provider === 'carto' || provider === 'ion') {
        swapToGradedOsm('tile-errors:3');
        return;
      }
      if (provider === 'osm') {
        tryAmapFallback('tile-errors:3');
        return;
      }
      setBasemapFailed(true);
    };
    if (provider === 'osm' && process.env.NODE_ENV !== 'test') {
      // 会话缓存让后续页面免探针、零闪烁（'1' 直接升级，'0' 保持）
      const cached = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(CARTO_SANE_CACHE_KEY) : null;
      if (cached === '1') {
        swapToCarto('cache:carto-sane');
      } else if (cached !== '0') {
        void probeTileSane(CARTO_PROBE_URL, true).then((sane) => {
          debug.probes.carto = sane;
          try {
            sessionStorage.setItem(CARTO_SANE_CACHE_KEY, sane ? '1' : '0');
          } catch {
            /* 隐私模式等场景下缓存失败不影响功能 */
          }
          if (sane && !instance.isDestroyed() && provider === 'osm') swapToCarto('probe:carto-sane');
        });
      }
      // OSM 也不可达的环境（部分内网/代理只有高德可达）：缓存后直达，避免每次探针
      const osmDead = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(OSM_DEAD_CACHE_KEY) === '1';
      if (osmDead) {
        tryAmapFallback('cache:osm-dead');
      } else {
        void probeTileSane(OSM_PROBE_URL, false).then((osmOk) => {
          debug.probes.osm = osmOk;
          if (!osmOk && !instance.isDestroyed() && provider === 'osm') {
            try {
              sessionStorage.setItem(OSM_DEAD_CACHE_KEY, '1');
            } catch {
              /* 忽略缓存失败 */
            }
            tryAmapFallback('probe:osm-unreachable');
          }
        });
      }
    }
    const stopObserving = observeTileFailures((url) => {
      if (PROVIDER_HOSTS[provider].test(url)) onTileFailure();
    });
    const onRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof Cesium.RequestErrorEvent) {
        event.preventDefault();
      }
    };
    window.addEventListener('unhandledrejection', onRejection);
    watchProviderErrors(instance.imageryLayers?.get(0));
    const teardown = (cleanup?: () => void) => {
      stopObserving();
      if (!instance.isDestroyed()) instance.camera.moveEnd.removeEventListener(mirrorCamera);
      window.removeEventListener('unhandledrejection', onRejection);
      detachProviderErrors?.();
      cleanup?.();
      if (!instance.isDestroyed()) instance.destroy();
    };
    let cleanup: (() => void) | undefined;
    try {
      const result = onReadyRef.current?.(instance);
      cleanup = typeof result === 'function' ? result : undefined;
    } catch (readyError) {
      // 页面 onReady 抛错：effect 还没返回清理函数，若直接抛出，viewer、瓦片观察的引用计数与
      // unhandledrejection 监听都会泄漏。这里先照常拆除，再把异常打到控制台并进入错误态
      teardown();
      console.error('Cesium scene onReady failed:', readyError);
      setViewer(null);
      setError(true);
      return undefined;
    }
    setViewer(instance);
    return () => teardown(cleanup);
    // 只在挂载与显式重试时创建（attempt 由 retry 递增）；home / viewerOptions 经 createOptionsRef 读取
  }, [attempt]);

  return { containerRef, viewer, error, basemapFailed, retry: () => setAttempt((n) => n + 1) };
};

/* ---------------------------------- 经纬网格 ---------------------------------- */

/** 视野密度驱动的网格步长（度）：保证两轴各 ≤ 20 条线 */
const gridStepFor = (spanDeg: number) => {
  const steps = [30, 15, 10, 5, 2, 1, 0.5, 0.25, 0.1];
  return steps.find((s) => spanDeg / s <= 20) ?? 0.05;
};

/**
 * 经纬网格（graticule）：PolylineCollection 贴虚拟高度画线，视野变化（moveEnd）后按
 * 当前跨度选步长重建。赤道与本初子午线略亮。HUD 的一部分，由 SceneStage 挂载。
 */
export const addGraticule = (viewer: Cesium.Viewer) => {
  const collection = new Cesium.PolylineCollection();
  viewer.scene.primitives.add(collection);
  const rebuild = () => {
    if (viewer.isDestroyed()) return;
    collection.removeAll();
    const rect = viewer.camera.computeViewRectangle();
    if (!rect) return;
    const south = Math.max(-89, Cesium.Math.toDegrees(rect.south));
    const north = Math.min(89, Cesium.Math.toDegrees(rect.north));
    const west = Cesium.Math.toDegrees(rect.west);
    const east = Cesium.Math.toDegrees(rect.east);
    const step = gridStepFor(Math.max(east - west, north - south));
    const materialOf = (major: boolean) =>
      Cesium.Material.fromType(Cesium.Material.ColorType, {
        color: Cesium.Color.fromCssColorString(major ? 'rgba(255,255,255,0.30)' : 'rgba(255,255,255,0.12)'),
      });
    for (let lng = Math.ceil(west / step) * step; lng <= east; lng += step) {
      collection.add({
        positions: Cesium.Cartesian3.fromDegreesArray([lng, south, lng, north]),
        width: 1,
        material: materialOf(Math.abs(lng % (step * 6)) < 1e-6),
      });
    }
    for (let lat = Math.ceil(south / step) * step; lat <= north; lat += step) {
      collection.add({
        positions: Cesium.Cartesian3.fromDegreesArray([west, lat, east, lat]),
        width: 1,
        material: materialOf(Math.abs(lat % (step * 6)) < 1e-6),
      });
    }
  };
  viewer.camera.moveEnd.addEventListener(rebuild);
  rebuild();
  return () => {
    viewer.camera.moveEnd.removeEventListener(rebuild);
    if (!viewer.isDestroyed()) viewer.scene.primitives.remove(collection);
  };
};

/* ---------------------------------- 场景舞台 ---------------------------------- */

export type SceneKpi = {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
};

const KPI_TONE_CSS: Record<NonNullable<SceneKpi['tone']>, string> = {
  default: 'var(--scene-ink)',
  success: '#52c41a',
  warning: '#faad14',
  danger: '#ff4d4f',
};

/**
 * 六场景统一舞台：整幅场景 + 玻璃面板槽位 + HUD（罗盘/比例尺/坐标读出/经纬网格开关）。
 * 槽位约定（全部叠加在场景之上）：
 * - title/kpis：左上场景标识与实时指标；actions：右上动作工具条
 * - panels：左列面板（编成/目标列表）；rightPanels：右列面板（事件流/详情）
 * - legend：左下图例；timeDeck：底部时间轴（TimeDeck）；children 保留给Alert等旧内容
 * 设计语言见 cesium.css 的 .scene-panel / .scene-chip 玻璃拟态，颜色随 antd 主题令牌。
 */
export const SceneStage = ({
  containerRef,
  viewer,
  error,
  basemapFailed,
  onRetryBasemap,
  title,
  kpis,
  actions,
  panels,
  rightPanels,
  legend,
  timeDeck,
  children,
  style,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewer: Cesium.Viewer | null;
  error: boolean;
  /** 底图瓦片连续加载失败（useCesiumViewer 检测） */
  basemapFailed?: boolean;
  onRetryBasemap?: () => void;
  /** 场景名（左上） */
  title?: ReactNode;
  /** 实时指标芯片（左上标题下方） */
  kpis?: SceneKpi[];
  /** 右上动作工具条 */
  actions?: ReactNode;
  /** 左列面板 */
  panels?: ReactNode;
  /** 右列面板 */
  rightPanels?: ReactNode;
  /** 左下图例 */
  legend?: ReactNode;
  /** 底部时间轴（TimeDeck） */
  timeDeck?: ReactNode;
  children?: ReactNode;
  style?: CSSProperties;
}) => {
  const intl = useIntl();
  const { token } = theme.useToken();
  const { sm } = Grid.useBreakpoint();
  const [coords, setCoords] = useState<string>();
  const [heightKm, setHeightKm] = useState<number>();
  const [graticuleOn, setGraticuleOn] = useState(false);
  const removeGraticuleRef = useRef<(() => void) | undefined>(undefined);

  // 罗盘 + 比例尺（cesium-navigation-es6）：从 Situation 独享提为六场景 HUD 的一部分
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return undefined;
    const navigation = new CesiumNavigation(viewer, {
      enableCompass: true,
      enableZoomControls: false,
      enableDistanceLegend: true,
    });
    return () => {
      // cesium-navigation-es6 无类型声明（allowJs 推断），destroy 经鸭子类型调用
      (navigation as { destroy?: () => void })?.destroy?.();
    };
  }, [viewer]);

  // 经纬网格开关
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return undefined;
    if (graticuleOn) {
      removeGraticuleRef.current = addGraticule(viewer);
      return () => {
        removeGraticuleRef.current?.();
        removeGraticuleRef.current = undefined;
      };
    }
    return undefined;
  }, [viewer, graticuleOn]);

  // 坐标读出：鼠标所在经纬度（十进制度 + MGRS）与相机高度，rAF 节流
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return undefined;
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    let raf = 0;
    handler.setInputAction((movement: { endPosition: Cesium.Cartesian2 }) => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const cartesian = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);
        if (!cartesian) {
          setCoords(undefined);
          return;
        }
        const carto = Cesium.Cartographic.fromCartesian(cartesian);
        const lng = Cesium.Math.toDegrees(carto.longitude);
        const lat = Cesium.Math.toDegrees(carto.latitude);
        let mgrs = '';
        try {
          mgrs = ` · ${mgrsForward([lng, lat], 3)}`;
        } catch {
          mgrs = '';
        }
        setCoords(`${lat.toFixed(4)}°, ${lng.toFixed(4)}°${mgrs}`);
        setHeightKm(viewer.camera.positionCartographic.height / 1000);
      });
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      handler.destroy();
    };
  }, [viewer]);

  if (error) return <CesiumInitError />;

  // 玻璃面板色随 antd 主题令牌：亮色=白玻璃、暗色=黑玻璃，色值经 CSS 变量下发到 cesium.css
  const hexToRgba = (hex: string, alpha: number) => {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 0xff}, ${(n >> 8) & 0xff}, ${n & 0xff}, ${alpha})`;
  };
  const themeVars = {
    '--scene-glass': hexToRgba(token.colorBgContainer, 0.82),
    '--scene-ink': token.colorText,
    '--scene-dim': token.colorTextTertiary,
    '--scene-border': token.colorSplit,
    '--scene-accent': '#36cfc9',
  } as CSSProperties;

  const hud = (
    <div className="scene-hud">
      {coords && (
        <span className="scene-coords" data-testid="scene-coords">
          {coords}
          {heightKm !== undefined && (
            <span className="scene-coords-alt">
              ALT {heightKm >= 100 ? `${Math.round(heightKm)} km` : `${Math.round(heightKm * 1000)} m`}
            </span>
          )}
        </span>
      )}
      <Tooltip title={intl.formatMessage({ id: 'cesium.hud.graticule' })}>
        <button
          type="button"
          aria-label={intl.formatMessage({ id: 'cesium.hud.graticule' })}
          aria-pressed={graticuleOn}
          className={`scene-grid-toggle${graticuleOn ? ' is-on' : ''}`}
          onClick={() => setGraticuleOn((v) => !v)}
        >
          #
        </button>
      </Tooltip>
    </div>
  );

  return (
    <div className="cesium-stage" style={{ ...themeVars, ...style }}>
      <div ref={containerRef} className="absolute inset-0" />
      {!viewer && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spin size="large" />
        </div>
      )}
      {viewer && basemapFailed && (
        // 窄屏铺满舞台宽度、重试按钮放到正文下方：w-fit 加右侧按钮在 ~300px 舞台上会把正文列挤成零宽（每行一个字母竖排）
        <div className="absolute inset-x-3 top-3 z-20 sm:inset-x-0 sm:mx-auto sm:w-fit" style={{ maxWidth: '92%' }}>
          <Alert
            type="warning"
            showIcon
            closable
            className="shadow-md"
            message={intl.formatMessage({ id: 'cesium.basemapFailed.title' })}
            description={
              <>
                {intl.formatMessage({ id: 'cesium.basemapFailed.desc' })}
                {!sm && (
                  <div className="mt-2">
                    <Button size="small" onClick={onRetryBasemap}>
                      {intl.formatMessage({ id: 'cesium.basemapFailed.retry' })}
                    </Button>
                  </div>
                )}
              </>
            }
            action={
              sm && (
                <Button size="small" onClick={onRetryBasemap}>
                  {intl.formatMessage({ id: 'cesium.basemapFailed.retry' })}
                </Button>
              )
            }
          />
        </div>
      )}
      {/* 左上：场景标识 + KPI 芯片 */}
      {(title || kpis?.length) && (
        <div className="scene-corner scene-corner-tl">
          {title && <div className="scene-title">{title}</div>}
          {kpis?.length ? (
            <div className="scene-kpis">
              {kpis.map((kpi) => (
                <span key={kpi.label} className="scene-chip" data-tour="scene-kpi">
                  <span className="scene-chip-label">{kpi.label}</span>
                  <span className="scene-chip-value" style={{ color: kpi.tone ? KPI_TONE_CSS[kpi.tone] : undefined }}>
                    {kpi.value}
                  </span>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}
      {actions && (
        <div className="scene-corner scene-corner-tr">
          <div className="scene-actions">{actions}</div>
        </div>
      )}
      {/* 左列：面板区在上（可滚动）、图例压在列尾。图例曾单独锚在左下角，
          海空态势的长编成树与 8 行图例互相覆盖 */}
      {(panels || legend) && (
        <div className="scene-corner scene-corner-l">
          {panels && <div className="scene-corner-panels">{panels}</div>}
          {legend && <div className="scene-corner-legend">{legend}</div>}
        </div>
      )}
      {rightPanels && <div className="scene-corner scene-corner-r">{rightPanels}</div>}
      {timeDeck && <div className="scene-timedeck-slot">{timeDeck}</div>}
      {hud}
      {children}
    </div>
  );
};

/** 与全站语义色一致的 Cesium 颜色 */
export const cesiumColor = (css: string, alpha = 1) => Cesium.Color.fromCssColorString(css).withAlpha(alpha);
