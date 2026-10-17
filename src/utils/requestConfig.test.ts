// @vitest-environment jsdom
/**
 * requestConfig 行为契约测试：状态码分流、token 生命周期与注入范围、网络错误分流，
 * 以及与 umi request 运行时调用约定的一致性（handler 同步调用、返回值被丢弃）。
 */
import { AUTH_TOKEN_KEY } from '@/constants';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { BizError } from './BizError';

const { errorMock, pushMock, assignMock } = vi.hoisted(() => ({
  errorMock: vi.fn(),
  pushMock: vi.fn(),
  assignMock: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: { push: pushMock },
  getIntl: () => ({
    formatMessage: ({ defaultMessage }: { defaultMessage?: string }) => defaultMessage ?? '',
  }),
  request: vi.fn(),
}));

vi.mock('@/utils/antdMessage', () => ({
  getMessage: () => ({ error: errorMock }),
  registerMessage: vi.fn(),
}));

// UMI_APP_API_BASE 是构建期 define 注入的全局常量，测试环境需先声明再动态 import
let requestConfig: (typeof import('./requestConfig'))['requestConfig'];
type ErrorHandler = (error: unknown, opts?: { skipErrorHandler?: boolean }) => unknown;
type Interceptor = (config: Record<string, unknown>) => {
  url?: string;
  baseURL?: string;
  withCredentials?: boolean;
  adapter?: unknown;
  auth?: unknown;
  headers?: Record<string, string>;
};
let errorHandler: ErrorHandler;
let interceptor: Interceptor;

beforeAll(async () => {
  (globalThis as Record<string, unknown>).UMI_APP_API_BASE = undefined;
  (globalThis as Record<string, unknown>).UMI_APP_DEMO_MODE = true;
  // PUBLIC_PATH 与 UMI_APP_API_BASE 同为构建期 define 注入的全局常量（401 整页跳转用）
  (globalThis as Record<string, unknown>).PUBLIC_PATH = '/';
  // 401 走 window.location.assign（整页跳转重置内存态），jsdom 下需替换 location 才能断言
  Object.defineProperty(window, 'location', {
    value: { ...window.location, assign: assignMock },
    writable: true,
  });
  ({ requestConfig } = await import('./requestConfig'));
  errorHandler = requestConfig.errorConfig!.errorHandler! as unknown as ErrorHandler;
  interceptor = requestConfig.requestInterceptors![0] as unknown as Interceptor;
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

const httpError = (status: number, data?: unknown) => ({ response: { status, data } });

/** 复刻 umi request 运行时的 catch 分支：同步调用 handler，捕获同步异常，随后 reject 原错误 */
const umiRequestFailing = (error: unknown, opts: { skipErrorHandler?: boolean } = {}) =>
  new Promise((_resolve, reject) => {
    try {
      errorHandler(error, opts);
    } catch (e) {
      reject(e);
    }
    reject(error);
  });

describe('请求拦截器：显式演示会话边界', () => {
  const withToken = () => sessionStorage.setItem(AUTH_TOKEN_KEY, 'admin-demo-token');

  it('无演示 token 时保留非敏感请求头但不注入凭证', () => {
    const result = interceptor({ url: '/api/v1/x', headers: { 'X-Test': '1' } });
    expect(result.headers?.['X-Test']).toBe('1');
    expect(result.headers?.Authorization).toBeUndefined();
  });

  it('现有 API 路径使用标签页内的演示 token', () => {
    withToken();
    expect(interceptor({ url: '/api/v1/x', headers: {} }).headers?.Authorization).toBe('Bearer admin-demo-token');
  });

  it('同源绝对地址也必须改用固定 API 路径', () => {
    withToken();
    const url = `${window.location.origin}/api/v1/x`;
    expect(() => interceptor({ url, headers: {} })).toThrow('under /api/v1/');
  });

  it('每次调用传入的 baseURL 不能声明自己的可信源', () => {
    withToken();
    expect(() => interceptor({ url: '/api/v1/x', baseURL: 'https://api.example.com', headers: {} })).toThrow(
      'overrides are disabled',
    );
  });

  it('第三方绝对地址在附带任何凭证之前被拒绝', () => {
    withToken();
    expect(() => interceptor({ url: 'https://third-party.example.org/data.json', headers: {} })).toThrow(
      'under /api/v1/',
    );
  });

  it('旧 localStorage bearer 不会自动恢复到演示请求', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'old-token');
    expect(interceptor({ url: '/api/v1/x' }).headers?.Authorization).toBeUndefined();
  });

  it('演示 adapter 不能被单次调用替换成网络 adapter', () => {
    const adapter = vi.fn();
    const result = interceptor({ url: '/api/v1/x', adapter, withCredentials: true });
    expect(result.adapter).not.toBe(adapter);
    expect(result.withCredentials).toBe(false);
  });
});

describe('errorHandler：HTTP 状态码分流（axios 形状）', () => {
  it('400 仅提示不跳页（保留表单上下文）', () => {
    expect(errorHandler(httpError(400))).toBeUndefined();
    expect(errorMock).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('401 清除 token 并整页跳转登录页（重置内存中的 initialState）', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'stale-token');
    sessionStorage.setItem(AUTH_TOKEN_KEY, 'stale-demo-token');
    errorHandler(httpError(401));
    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(AUTH_TOKEN_KEY)).toBeNull();
    expect(assignMock).toHaveBeenCalledWith('/login?reason=expired');
  });

  it('401 带上当前页面作为回跳地址与过期原因（整页跳转会冲掉 toast，原因交给登录页展示）', () => {
    const { pathname, search } = window.location;
    Object.assign(window.location, { pathname: '/system/users', search: '?keyword=iris' });
    try {
      errorHandler(httpError(401));
      expect(assignMock).toHaveBeenCalledWith('/login?redirect=%2Fsystem%2Fusers%3Fkeyword%3Diris&reason=expired');
      expect(errorMock).not.toHaveBeenCalled();
    } finally {
      Object.assign(window.location, { pathname, search });
    }
  });

  it('已在登录页时 401 只提示，不再原地整页刷新', () => {
    const { pathname } = window.location;
    Object.assign(window.location, { pathname: '/login' });
    try {
      errorHandler(httpError(401));
      expect(assignMock).not.toHaveBeenCalled();
      expect(errorMock).toHaveBeenCalledTimes(1);
    } finally {
      Object.assign(window.location, { pathname });
    }
  });

  it('403 提示并跳转 /403', () => {
    errorHandler(httpError(403));
    expect(pushMock).toHaveBeenCalledWith('/exception/403');
  });

  it('404 仅提示停留当前页', () => {
    errorHandler(httpError(404, { message: '用户不存在' }));
    expect(errorMock).toHaveBeenCalledWith('用户不存在');
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('500 提示服务器错误', () => {
    errorHandler(httpError(500));
    expect(errorMock).toHaveBeenCalledTimes(1);
  });

  it('413 等其它状态也优先展示后端 message，且不跳页（导入超预算时用户要看到具体原因）', () => {
    errorHandler(httpError(413, { success: false, message: '导入数据超出服务端上限' }));
    expect(errorMock).toHaveBeenCalledWith('导入数据超出服务端上限');
    expect(pushMock).not.toHaveBeenCalled();
    errorMock.mockClear();
    // 没有 message 时仍是带状态码的兜底文案
    errorHandler(httpError(413));
    expect(errorMock).toHaveBeenCalledTimes(1);
    expect(errorMock.mock.calls[0]![0]).not.toBe('导入数据超出服务端上限');
  });

  it('优先展示后端返回体中的 message', () => {
    errorHandler(httpError(400, { error: { message: '后端参数错误' } }));
    expect(errorMock).toHaveBeenCalledWith('后端参数错误');
  });
});

describe('请求拦截器：真实 Cookie 会话', () => {
  let realInterceptor: Interceptor;
  beforeAll(async () => {
    vi.resetModules();
    (globalThis as Record<string, unknown>).UMI_APP_DEMO_MODE = false;
    (globalThis as Record<string, unknown>).UMI_APP_API_BASE = '/backend';
    const { requestConfig: realConfig } = await import('./requestConfig');
    realInterceptor = realConfig.requestInterceptors![0] as unknown as Interceptor;
  });

  it('使用固定同源 API 前缀和 Cookie，不读取持久或演示 bearer', () => {
    localStorage.setItem(AUTH_TOKEN_KEY, 'old-bearer');
    sessionStorage.setItem(AUTH_TOKEN_KEY, 'demo-bearer');
    const result = realInterceptor({
      url: '/api/v1/currentUser',
      baseURL: '/backend',
      headers: { authorization: 'manual-bearer', 'X-Test': '1' },
    });
    expect(result.url).toBe(`${window.location.origin}/backend/api/v1/currentUser`);
    expect(result.baseURL).toBeUndefined();
    expect(result.withCredentials).toBe(true);
    expect(result.headers?.authorization).toBeUndefined();
    expect(result.headers?.Authorization).toBeUndefined();
    expect(result.headers?.['X-Test']).toBe('1');
  });

  it('写请求携带服务端必须验证的 CSRF 非简单请求头', () => {
    const result = realInterceptor({
      url: '/api/v1/logout',
      method: 'POST',
      headers: { 'x-requested-with': 'forged' },
      withCredentials: false,
      auth: { username: 'old', password: 'old' },
    });
    expect(result.headers?.['X-Requested-With']).toBe('XMLHttpRequest');
    expect(result.headers?.['Content-Type']).toBe('application/json');
    expect(result.withCredentials).toBe(true);
    expect(result.auth).toBeUndefined();
  });

  it.each([
    '//evil.test/api/v1/users',
    '/\\evil.test/api/v1/users',
    '/api/v1/../../outside',
    '/api/v1/%2e%2e/outside',
    '/api/v1/%252e%252e/outside',
    '/api/v1/a%2fb',
    '/api/v1/a%5cb',
    '/api/v1/a\nb',
    '/api/v1/a%0ab',
    '/api/v1/bad%escape',
  ])('拒绝地址别名与不同解析器的歧义输入：%s', (url) => {
    expect(() => realInterceptor({ url })).toThrow();
  });

  it('拒绝单次调用切换真实凭证来源', () => {
    expect(() => realInterceptor({ url: '/api/v1/users', baseURL: 'https://evil.test' })).toThrow(
      'overrides are disabled',
    );
    expect(() => realInterceptor({ url: '/api/v1/users', baseURL: '/' })).toThrow('overrides are disabled');
  });

  it('开发环境没有配置真实 API 时也不会回落到演示认证', async () => {
    vi.resetModules();
    (globalThis as Record<string, unknown>).UMI_APP_API_BASE = undefined;
    const { requestConfig: missingConfig } = await import('./requestConfig');
    const missingInterceptor = missingConfig.requestInterceptors![0] as unknown as Interceptor;
    expect(missingConfig.adapter).toBeUndefined();
    expect(() => missingInterceptor({ url: '/api/v1/login' })).toThrow('configured same-origin API');
  });
});

describe('errorHandler：业务错误、取消与网络层', () => {
  it('BizError（success:false）只提示，不返回 rejected promise', () => {
    const biz = new BizError({ message: '业务处理失败', errorCode: 1001 });
    expect(errorHandler(biz)).toBeUndefined();
    expect(errorMock).toHaveBeenCalledWith('业务处理失败');
  });

  it('主动取消的请求不提示', () => {
    errorHandler({ code: 'ERR_CANCELED', name: 'CanceledError' });
    expect(errorMock).not.toHaveBeenCalled();
  });

  it('超时（ECONNABORTED）提示超时文案', () => {
    errorHandler({ code: 'ECONNABORTED' });
    expect(errorMock).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it('无 response 的未知错误走网络异常分支', () => {
    errorHandler(new Error('boom'));
    expect(errorMock).toHaveBeenCalledTimes(1);
  });
});

describe('与 umi request 运行时调用约定一致', () => {
  const unhandled = vi.fn();
  beforeEach(() => {
    process.on('unhandledRejection', unhandled);
  });
  afterEach(() => {
    process.off('unhandledRejection', unhandled);
  });

  it('失败请求只把错误 reject 给调用方，不产生无人处理的 rejection', async () => {
    const error = httpError(500);
    await expect(umiRequestFailing(error)).rejects.toBe(error);
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(unhandled).not.toHaveBeenCalled();
  });

  it('skipErrorHandler：不提示，错误原样交给调用方', async () => {
    const error = httpError(404);
    await expect(umiRequestFailing(error, { skipErrorHandler: true })).rejects.toBe(error);
    expect(errorMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
