/**
 * 底图瓦片失败观测（引用计数单例）：
 * 以前每个 viewer 挂载都各自改写 window.fetch / XHR.open 再复原，两个 viewer
 * 并发初始化时会互相覆盖补丁与原件（实测隐患）。现在整个页面生命周期只安装一次，
 * 各 viewer 以观察者身份订阅/退订，安装与卸载由引用计数保证。
 * 三条互补检测路径保留：fetch 包装（离线最直接）、XHR open error 监听
 * （Cesium fetchImage 走 XHR）、unhandledrejection（CSP 拦截等场景，同时吞掉避免刷屏）。
 */

/** 全部底图链路的瓦片主机：OSM、carto 暗色、高德兜底、ion（含其引用的 Bing 影像）。
 *  漏掉某个主机 = 该底图运行期的网络失败完全不可观测（曾漏掉高德，兜底层挂了也不告警） */
const TILE_HOSTS = /tile\.openstreetmap\.org|basemaps\.cartocdn\.com|\.autonavi\.com|\.cesium\.com|\.virtualearth\.net/;

type FailureListener = (url: string) => void;
type XhrOpen = (...args: never[]) => void;
const listeners = new Set<FailureListener>();
let refs = 0;
let originalFetch: typeof window.fetch | undefined;
let originalXhrOpen: XhrOpen | undefined;

const notify = (url: string) => {
  listeners.forEach((listener) => listener(url));
};

const install = () => {
  refs += 1;
  if (refs > 1) return;

  originalFetch = window.fetch;
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const request = originalFetch!.call(window, input as RequestInfo, init);
    if (typeof url === 'string' && TILE_HOSTS.test(url)) {
      void request.catch(() => notify(url));
    }
    return request;
  }) as typeof window.fetch;

  originalXhrOpen = XMLHttpRequest.prototype.open as XhrOpen;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: never[]) {
    const url = String(args[1] ?? '');
    if (TILE_HOSTS.test(url)) {
      this.addEventListener('error', () => notify(url));
    }
    return originalXhrOpen!.apply(this, args);
  } as unknown as typeof XMLHttpRequest.prototype.open;
};

const uninstall = () => {
  refs = Math.max(0, refs - 1);
  if (refs > 0) return;
  if (originalFetch) window.fetch = originalFetch;
  if (originalXhrOpen)
    XMLHttpRequest.prototype.open = originalXhrOpen as unknown as typeof XMLHttpRequest.prototype.open;
  originalFetch = undefined;
  originalXhrOpen = undefined;
};

/** 订阅瓦片失败；返回退订函数。回调里不要做重活（每次失败都会触发） */
export const observeTileFailures = (onFailure: FailureListener) => {
  listeners.add(onFailure);
  install();
  return () => {
    listeners.delete(onFailure);
    uninstall();
  };
};
