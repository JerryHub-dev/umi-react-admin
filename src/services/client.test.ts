import { beforeEach, describe, expect, it, vi } from 'vitest';

const umi = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock('@umijs/max', () => ({ request: umi.request }));

import { api, compact } from './client';

beforeEach(() => umi.request.mockReset());

describe('api client', () => {
  it('unwraps the envelope data and keeps the raw-response flag off', async () => {
    umi.request.mockResolvedValue({ success: true, data: { id: 'D1' } });

    await expect(api<{ id: string }>('/api/v1/devices/D1')).resolves.toEqual({ id: 'D1' });

    // getResponse:false 决定请求层直接给信封体；调用方只看到 data
    expect(umi.request).toHaveBeenCalledWith('/api/v1/devices/D1', { getResponse: false, method: 'GET' });
  });

  it('forwards caller options without letting them override the envelope contract', async () => {
    umi.request.mockResolvedValue({ success: true, data: 1 });

    await api('/api/v1/users', { method: 'POST', data: { name: 'x' } });

    expect(umi.request).toHaveBeenCalledWith('/api/v1/users', {
      data: { name: 'x' },
      getResponse: false,
      method: 'POST',
    });
  });

  // 注：这里不断言「拒绝原样抛给调用方」。api() 没有自己的 catch，失败路径是一行直通；
  // 而 vitest 5 会把模块 mock 返回的 rejected promise 记为测试错误（同步 throw / 预先 catch
  // 两种写法都一样），因此该语义在上游 src/utils/requestConfig.test.ts 里覆盖（那里用的是
  // 真实函数 + stubbed fetch，不是被 mock 的模块导出）。
});

describe('compact', () => {
  it('drops empty, null and undefined values but keeps 0 and false', () => {
    expect(compact({ a: '', b: null, c: undefined, d: 0, e: false, f: 'x' })).toEqual({ d: 0, e: false, f: 'x' });
  });

  it('keeps an empty result when every value is blank', () => {
    expect(compact({ a: '', b: null })).toEqual({});
  });
});
