// @vitest-environment jsdom
import type * as CesiumNS from 'cesium';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type MockViewer = {
  container: unknown;
  destroyed: boolean;
  setViewCalls: unknown[];
  flyToCalls: unknown[];
  camera: { setView: (view: unknown) => void; flyTo: (view: unknown) => void };
  scene: { globe: Record<string, unknown> };
  imageryLayers: { get: (index: number) => undefined };
  isDestroyed: () => boolean;
  destroy: () => void;
};

const cesium = vi.hoisted(() => ({
  constructed: [] as { container: unknown; options: Record<string, unknown> }[],
  instances: [] as MockViewer[],
  failInit: false,
}));

vi.mock('cesium', () => {
  class Viewer {
    container: unknown;
    destroyed = false;
    setViewCalls: unknown[] = [];
    flyToCalls: unknown[] = [];
    camera = {
      setView: (view: unknown) => {
        this.setViewCalls.push(view);
      },
      flyTo: (view: unknown) => {
        this.flyToCalls.push(view);
      },
    };
    scene = { globe: {} as Record<string, unknown> };
    imageryLayers = { get: () => undefined };
    constructor(container: unknown, options: Record<string, unknown>) {
      if (cesium.failInit) throw new Error('WebGL unavailable');
      this.container = container;
      cesium.constructed.push({ container, options });
      cesium.instances.push(this);
    }
    isDestroyed() {
      return this.destroyed;
    }
    destroy() {
      this.destroyed = true;
    }
  }
  return {
    Viewer,
    Ion: { defaultAccessToken: '' },
    Cartesian3: { fromDegrees: (...args: number[]) => ({ kind: 'fromDegrees', args }) },
    Color: { fromCssColorString: () => ({ withAlpha: () => ({}) }) },
    ImageryLayer: class {
      constructor(public provider: unknown) {}
    },
    OpenStreetMapImageryProvider: class {
      constructor(public options: unknown) {}
    },
    RequestErrorEvent: class {},
    Math: { toRadians: (deg: number) => (deg * Math.PI) / 180 },
    EasingFunction: { QUADRATIC_IN_OUT: 'quadratic-in-out' },
  };
});

vi.mock('@umijs/max', () => ({ useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }) }));

import { useCesiumViewer } from './index';

type HarnessProps = {
  home?: [number, number, number];
  instantEntry?: boolean;
  viewerOptions?: CesiumNS.Viewer.ConstructorOptions;
  onReady?: (viewer: CesiumNS.Viewer) => void | (() => void);
};

/** 真实挂载 hook：创建 / 重试 / 卸载都发生在 effect 里，必须走 React 生命周期而不是直接调函数 */
const Harness = (props: HarnessProps) => {
  const { containerRef, viewer, error, basemapFailed, retry } = useCesiumViewer({
    home: props.home,
    instantEntry: props.instantEntry,
    viewerOptions: props.viewerOptions,
    onReady: props.onReady,
  });
  return (
    <div>
      <div ref={containerRef} data-testid="stage" />
      <span data-testid="state">{error ? 'error' : viewer ? 'ready' : 'pending'}</span>
      <span data-testid="basemap">{basemapFailed ? 'failed' : 'ok'}</span>
      <button type="button" onClick={retry}>
        retry
      </button>
    </div>
  );
};

const mount = (props: HarnessProps = {}) => {
  const host = document.createElement('div');
  document.body.append(host);
  const root: Root = createRoot(host);
  const render = (next: HarnessProps) => act(() => root.render(<Harness {...next} />));
  render(props);
  const stage = host.querySelector<HTMLElement>('[data-testid="stage"]');
  const text = (testId: string) => host.querySelector(`[data-testid="${testId}"]`)?.textContent;
  const clickRetry = () => act(() => host.querySelector('button')?.click());
  return { root, render, text, stage, clickRetry, unmount: () => act(() => root.unmount()) };
};

const flush = () =>
  act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });

const originalFetch = window.fetch;
beforeEach(() => {
  // 必须在渲染前设置：否则 React 19 的 act() 会退化成不带批处理的告警路径
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  cesium.constructed.length = 0;
  cesium.instances.length = 0;
  cesium.failInit = false;
});
afterEach(() => {
  window.fetch = originalFetch;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('useCesiumViewer lifecycle', () => {
  it('creates one viewer on the stage node, flies in cinematically, applies onReady, then destroys on unmount', () => {
    const readyCleanup = vi.fn();
    // 形参不能省：零参 vi.fn 的 mock.calls 类型是 [][]，后续 calls[0][0] 会报 TS2493
    const onReady = vi.fn((_viewer: unknown) => readyCleanup);
    const harness = mount({ home: [116.4, 39.9, 800], viewerOptions: { timeline: true }, onReady });

    expect(cesium.constructed).toHaveLength(1);
    expect(cesium.constructed[0].container).toBe(harness.stage);
    expect(cesium.constructed[0].options).toMatchObject({ geocoder: false, timeline: true });
    // 电影感入场：先在约 2.6 倍高度 + 600km 处落位（正俯视），再缓动推近到 home 定妆镜头
    const pose = { heading: 0, pitch: -Math.PI / 2, roll: 0 };
    expect(cesium.instances[0].setViewCalls).toEqual([
      {
        destination: { kind: 'fromDegrees', args: [116.4, 39.9, 800 * 2.6 + 600_000] },
        orientation: pose,
      },
    ]);
    expect(cesium.instances[0].flyToCalls).toEqual([
      {
        destination: { kind: 'fromDegrees', args: [116.4, 39.9, 800] },
        orientation: pose,
        duration: 2.2,
        easingFunction: 'quadratic-in-out',
      },
    ]);
    expect(onReady).toHaveBeenCalledTimes(1);
    expect(onReady.mock.calls[0]?.[0]).toBe(cesium.instances[0]);
    expect(harness.text('state')).toBe('ready');

    harness.unmount();
    expect(readyCleanup).toHaveBeenCalledTimes(1);
    expect(cesium.instances[0].destroyed).toBe(true);
    expect(window.fetch).toBe(originalFetch);
  });

  it('skips the flyover and lands directly on home when instantEntry is set', () => {
    const harness = mount({ home: [116.4, 39.9, 800], instantEntry: true });

    expect(cesium.instances[0].setViewCalls).toEqual([
      {
        destination: { kind: 'fromDegrees', args: [116.4, 39.9, 800] },
        orientation: { heading: 0, pitch: -Math.PI / 2, roll: 0 },
      },
    ]);
    expect(cesium.instances[0].flyToCalls).toEqual([]);
    harness.unmount();
  });

  it('does not recreate the viewer when the caller passes fresh inline options on re-render', async () => {
    // 回归：home / viewerOptions 若直接进 effect 依赖，调用方的内联字面量会每次渲染重建 Viewer（连瓦片重拉）
    const harness = mount({ home: [108, 35, 7_000_000], viewerOptions: { timeline: false } });
    expect(cesium.constructed).toHaveLength(1);

    harness.render({ home: [108, 35, 7_000_000], viewerOptions: { timeline: false } });
    harness.render({ home: [108, 35, 7_000_000], viewerOptions: { timeline: false } });
    await flush();

    expect(cesium.constructed).toHaveLength(1);
    expect(cesium.instances[0].destroyed).toBe(false);
    harness.unmount();
  });

  it('retry destroys the previous viewer and creates a new one', () => {
    const harness = mount();
    expect(cesium.constructed).toHaveLength(1);

    harness.clickRetry();

    expect(cesium.instances[0].destroyed).toBe(true);
    expect(cesium.constructed).toHaveLength(2);
    expect(cesium.instances[1].destroyed).toBe(false);
    expect(harness.text('state')).toBe('ready');
    harness.unmount();
  });

  it('surfaces the error state when the viewer cannot be created', () => {
    // 初始化失败时 hook 内部会 console.error 上报；测试里屏蔽掉，避免污染输出
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    cesium.failInit = true;
    const harness = mount();

    expect(cesium.constructed).toHaveLength(0);
    expect(harness.text('state')).toBe('error');
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
    harness.unmount();
  });

  it('flags a failed basemap after three tile fetch failures', async () => {
    // 离线 / CSP 拦截：底图瓦片请求连续失败 3 次后要给出可见反馈（F01），而不是静默留一张空地图
    window.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof window.fetch;
    const harness = mount();
    expect(harness.text('basemap')).toBe('ok');

    await act(async () => {
      await Promise.all(
        [1, 2, 3].map(() => window.fetch('https://tile.openstreetmap.org/1/2/3.png').catch(() => undefined)),
      );
    });

    expect(harness.text('basemap')).toBe('failed');
    harness.unmount();
  });
});
