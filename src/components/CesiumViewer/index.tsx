import { readBuildGlobal } from '@/utils/buildGlobals';
import { useIntl } from '@umijs/max';
import { Alert, Button, Result, Spin } from 'antd';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import './cesium.css';

/** 演示页通用的 Viewer 控件配置：关闭动画、时间轴、信息框、帮助等，保留 2D/3D 切换 */
const DEMO_VIEWER_OPTIONS: Cesium.Viewer.ConstructorOptions = {
  animation: false,
  infoBox: false,
  sceneModePicker: true,
  selectionIndicator: false,
  timeline: false,
  navigationHelpButton: false,
  navigationInstructionsInitiallyVisible: false,
  shouldAnimate: true,
  skyAtmosphere: false,
  skyBox: false,
  vrButton: false,
  baseLayerPicker: false,
};

let configured = false;
/** 是否用 ion 默认影像（需要 token 且 https 页面）；否则回落无需凭据的 OSM 底图 */
export const shouldUseIonImagery = () => {
  const token = readBuildGlobal('CESIUM_ION_TOKEN');
  const httpsPage = typeof window === 'undefined' || window.location.protocol === 'https:';
  // http 托管页（本地 e2e、Docker 经 http 内网访问）上 Bing 兜底影像瓦片也走 http，
  // 会被 CSP connect-src（仅放行 https://*.virtualearth.net）拦截（CLAUDE.md 已记录）：
  // 这种页面一律用 OSM 底图，影像完整可用；https 部署保持 ion 影像
  return !!token && httpsPage;
};

/** 全局一次：挂 window.Cesium（部分插件依赖）并设置 ion token（未配置时为空串 → OSM 兜底） */
const configureCesium = () => {
  if (configured) return;
  configured = true;
  if (typeof window !== 'undefined' && !window.Cesium) window.Cesium = Cesium;
  Cesium.Ion.defaultAccessToken = readBuildGlobal('CESIUM_ION_TOKEN');
};

/**
 * 创建演示页 Viewer。WebGL 不可用等初始化失败时返回 null，调用方渲染错误态而不是整块空白。
 * 注意：不要隐藏 cesiumWidget.creditContainer——Cesium ion 与影像/地形数据提供方的条款要求显示署名。
 */
export const createDemoViewer = (container: string | Element, options: Cesium.Viewer.ConstructorOptions = {}) => {
  configureCesium();
  try {
    const baseLayer = shouldUseIonImagery()
      ? undefined
      : new Cesium.ImageryLayer(new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' }));
    return new Cesium.Viewer(container, {
      ...DEMO_VIEWER_OPTIONS,
      geocoder: false,
      ...(baseLayer ? { baseLayer } : {}),
      ...options,
    });
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
  viewerOptions?: Cesium.Viewer.ConstructorOptions;
  /** Viewer 创建后执行一次（添加图层、事件等）；返回的函数在销毁前调用 */
  onReady?: (viewer: Cesium.Viewer) => void | (() => void);
};

/**
 * 六个 Cesium 页共用的生命周期：创建、初始视角、错误态、卸载时销毁（含 onReady 注册的清理）。
 * 此前每页各写一份 useEffect，清理逻辑参差（外部 ScreenSpaceEventHandler 漏销毁、卸载竞态等）。
 */
export const useCesiumViewer = ({
  home = [108, 35, 7_000_000],
  viewerOptions,
  onReady,
}: UseCesiumViewerOptions = {}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);
  const [error, setError] = useState(false);
  /** 底图瓦片连续失败（离线/CSP 拦截/限流）时置位：CesiumStage 展示可见说明与重试（F01） */
  const [basemapFailed, setBasemapFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    if (!containerRef.current) return undefined;
    setBasemapFailed(false);
    const instance = createDemoViewer(containerRef.current, viewerOptions);
    if (!instance) {
      setError(true);
      return undefined;
    }
    instance.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(...home) });
    // 底图失败检测（F01），三条互补路径：
    // 1) fetch 层计数：对瓦片主机的失败请求计数（离线/被拦截时最直接，不依赖 Cesium 内部事件的触发时机）；
    // 2) 影像层瓦片错误事件（部分版本在重试耗尽后触发）；
    // 3) RequestErrorEvent 未处理拒绝（CSP 拦截等场景，同时吞掉避免刷屏 Uncaught (in promise)）。
    // 缺几块瓦片不影响场景可用；连续失败到一定数量说明底图整体不可用：
    // 置位 basemapFailed，由 CesiumStage 给出可见反馈与重试。
    let tileFailures = 0;
    const countTileFailure = () => {
      tileFailures += 1;
      if (tileFailures >= 3) setBasemapFailed(true);
    };
    const TILE_HOSTS = /tile\.openstreetmap\.org|\.cesium\.com|ion\.cesium\.com/;
    const originalFetch = window.fetch;
    window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const request = originalFetch.call(window, input as RequestInfo, init);
      if (typeof url === 'string' && TILE_HOSTS.test(url)) {
        void request.catch(() => countTileFailure());
      }
      return request;
    }) as typeof window.fetch;
    // Cesium 的影像请求走 XHR（fetchImage）：open 阶段挂 error 监听，网络层失败直接可观测
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: Parameters<typeof originalXhrOpen>) {
      const url = String(args[1] ?? '');
      if (TILE_HOSTS.test(url)) {
        this.addEventListener('error', () => countTileFailure());
      }
      return originalXhrOpen.apply(this, args);
    } as typeof originalXhrOpen;
    const onRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof Cesium.RequestErrorEvent) {
        event.preventDefault();
        countTileFailure();
      }
    };
    window.addEventListener('unhandledrejection', onRejection);
    // 瓦片失败事件在 ImageryLayer（而不是 provider）上：部分版本在重试后触发
    const imageryLayer = instance.imageryLayers?.get(0);
    const removeErrorListener = imageryLayer?.errorEvent?.addEventListener?.(countTileFailure);
    const cleanup = onReadyRef.current?.(instance);
    setViewer(instance);
    return () => {
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXhrOpen;
      window.removeEventListener('unhandledrejection', onRejection);
      removeErrorListener?.();
      cleanup?.();
      if (!instance.isDestroyed()) instance.destroy();
    };
    // 只在挂载与显式重试时创建（attempt 由 retry 递增）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  return { containerRef, viewer, error, basemapFailed, retry: () => setAttempt((n) => n + 1) };
};

/** 场景容器：错误态、加载态、底图失败反馈与可选的浮层（图例、提示）统一在这里 */
export const CesiumStage = ({
  containerRef,
  viewer,
  error,
  basemapFailed,
  onRetryBasemap,
  overlay,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewer: Cesium.Viewer | null;
  error: boolean;
  /** 底图瓦片连续加载失败（useCesiumViewer 检测） */
  basemapFailed?: boolean;
  onRetryBasemap?: () => void;
  overlay?: ReactNode;
}) => {
  const intl = useIntl();
  if (error) return <CesiumInitError />;
  return (
    <div className="cesium-stage">
      <div ref={containerRef} className="absolute inset-0" />
      {!viewer && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spin size="large" />
        </div>
      )}
      {/* 底图不可用时给出可见说明与重试（F01）：不能静默留下无地理参照的业务图层 */}
      {viewer && basemapFailed && (
        <div className="absolute inset-x-0 top-3 z-20 mx-auto w-fit" style={{ maxWidth: '92%' }}>
          <Alert
            type="warning"
            showIcon
            closable
            className="shadow-md"
            message={intl.formatMessage({ id: 'cesium.basemapFailed.title' })}
            description={intl.formatMessage({ id: 'cesium.basemapFailed.desc' })}
            action={
              <Button size="small" onClick={onRetryBasemap}>
                {intl.formatMessage({ id: 'cesium.basemapFailed.retry' })}
              </Button>
            }
          />
        </div>
      )}
      {overlay && <div className="pointer-events-none absolute top-3 left-3 z-10">{overlay}</div>}
    </div>
  );
};

/** 与全站语义色一致的 Cesium 颜色 */
export const cesiumColor = (css: string, alpha = 1) => Cesium.Color.fromCssColorString(css).withAlpha(alpha);
