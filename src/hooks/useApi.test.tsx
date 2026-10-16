// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useApi } from './useApi';

type ApiState<T> = ReturnType<typeof useApi<T>>;

/**
 * 最小 harness：把 hook 挂到真实 DOM 树里，每次渲染记录一份快照。
 * useApi 的关键行为都在 effect（三态流转、deps 变化丢弃旧响应、卸载丢弃迟到响应），
 * 必须走真实挂载而不是直接调用函数。
 */
const mount = <T,>(fetcher: () => Promise<T>, deps?: unknown[]) => {
  const root: Root = createRoot(document.createElement('div'));
  const states: ApiState<T>[] = [];
  const Probe = ({ fetcher: current, deps: currentDeps }: { fetcher: () => Promise<T>; deps?: unknown[] }) => {
    states.push(useApi(current, currentDeps));
    return null;
  };
  act(() => root.render(<Probe fetcher={fetcher} deps={deps} />));
  return {
    states,
    latest: () => states[states.length - 1],
    rerender: (next: () => Promise<T>, nextDeps?: unknown[]) =>
      act(() => root.render(<Probe fetcher={next} deps={nextDeps} />)),
    unmount: () => act(() => root.unmount()),
  };
};

/** 冲掉 promise 链（fetch → then/catch → finally）与随之而来的状态更新 */
const flush = () =>
  act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  });

beforeEach(() => {
  // 必须在渲染前设置：否则 React 19 的 act() 会退化成不带批处理的告警路径
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});

describe('useApi', () => {
  it('goes loading → data and reload() re-runs the fetcher', async () => {
    const fetcher = vi.fn(() => Promise.resolve('first'));
    const harness = mount(fetcher);

    expect(harness.latest().loading).toBe(true);
    expect(harness.latest().data).toBeUndefined();

    await flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(harness.latest().data).toBe('first');
    expect(harness.latest().loading).toBe(false);
    expect(harness.latest().error).toBeUndefined();

    act(() => harness.latest().reload());
    expect(harness.latest().loading).toBe(true);
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(harness.latest().data).toBe('first');

    harness.unmount();
  });

  it('exposes the rejection as error and leaves loading off', async () => {
    const boom = new Error('boom');
    const harness = mount(() => Promise.reject(boom));

    await flush();
    expect(harness.latest().error).toBe(boom);
    expect(harness.latest().loading).toBe(false);
    expect(harness.latest().data).toBeUndefined();

    harness.unmount();
  });

  it('normalises a non-Error rejection so the error state is always renderable', async () => {
    // 请求层可能 reject 非 Error（例如 undefined）：error 态不能变成 undefined 而渲染不出占位
    const harness = mount(() => Promise.reject(undefined));

    await flush();
    expect(harness.latest().error).toBeInstanceOf(Error);
    expect(harness.latest().error).toHaveProperty('message', 'request failed');

    harness.unmount();
  });

  it('drops the previous response when caller deps change (no stale data)', async () => {
    let resolveFirst: (value: string) => void = () => undefined;
    const first = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const second = vi.fn(() => Promise.resolve('second'));
    const harness = mount(first, ['a']);

    // 调用方参数变化：新 effect 先跑，第一条请求仍在飞行中
    harness.rerender(second, ['b']);
    await flush();
    expect(harness.latest().data).toBe('second');

    // 迟到的旧响应必须被丢弃，否则界面会退回上一个参数的数据
    await act(async () => {
      resolveFirst('first-late');
      await Promise.resolve();
    });
    expect(harness.latest().data).toBe('second');

    harness.unmount();
  });

  it('does not write state for a response that arrives after unmount', async () => {
    let resolveFetch: (value: string) => void = () => undefined;
    const fetcher = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const harness = mount(fetcher);

    harness.unmount();
    await act(async () => {
      resolveFetch('late');
      await Promise.resolve();
    });

    // 卸载后再渲染的 state 更新会告警；这里断言最后一次快照仍是初始三态
    expect(harness.states.at(-1)?.data).toBeUndefined();
    expect(harness.states.at(-1)?.loading).toBe(true);
  });
});
