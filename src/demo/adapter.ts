/**
 * 演示模式的 axios adapter：请求不出浏览器，交给同页运行的演示后端（src/demo/server）。
 *
 * 为什么不用 MSW：Service Worker 只在安全上下文（https / localhost）可用——Docker 部署后
 * 经 http://内网IP 访问时整站无法登录；且 msw 带 18 个直接依赖（graphql、yargs、tough-cookie…）。
 * adapter 方案零依赖、任何托管方式都能用，同一套 handler 同时服务 dev 与所有静态部署。
 *
 * 演示后端代码（生成器 + 路由）经动态 import 单独分包，首个请求时才加载，不进入口 chunk。
 * 演示时钟（src/demo/clock.ts）决定「现在」：实时模式跟随系统时间，受控场景冻结在进入时刻。
 * 多标签页经 storage 事件互通：其他标签页的补丁写入/重置会让本标签页重新加载演示数据。
 */
import { getLocale } from '@umijs/max';
import { demoClock } from './clock';
import type { DemoServer } from './server';
import { STORE_KEY } from './store';

type AdapterConfig = {
  method?: string;
  url?: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: { get?: (name: string) => unknown } & Record<string, unknown>;
};

let serverPromise: Promise<DemoServer> | undefined;

const loadServer = () => {
  serverPromise ??= import('./server').then(({ createDemoServer }) =>
    createDemoServer({
      locale: getLocale() === 'en-US' ? 'en-US' : 'zh-CN',
      storage: typeof window === 'undefined' ? undefined : window.localStorage,
      now: () => demoClock.now(),
    }),
  );
  return serverPromise;
};

// 多标签页：其他标签页写入补丁/重置演示数据时，本标签页重新加载，不再静默沿用旧数据
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORE_KEY) return;
    void loadServer().then((server) => server.store.syncFromStorage());
  });
}

/** 上一个请求的「轮到它返回」的时刻：所有请求排成一队 */
let queue: Promise<void> = Promise.resolve();

/**
 * 模拟网络耗时，让加载态在演示里真实可见；响应按发出顺序返回（像同一条连接上的请求）。
 * 耗时随机却允许乱序时，快速切换筛选（如告警页「只看未恢复」）的旧请求可能晚到：ProTable 的中止
 * 只停 loading、不拦已发出请求的回写，旧结果会覆盖新结果；读写交错时读请求也可能读到写之前的数据
 */
const latency = () => {
  const own = new Promise<void>((resolve) => {
    setTimeout(resolve, 120 + Math.random() * 200);
  });
  const turn = Promise.all([own, queue]).then(() => undefined);
  queue = turn;
  return turn;
};

const header = (headers: AdapterConfig['headers'], name: string) =>
  String(headers?.get?.(name) ?? headers?.[name] ?? '') || undefined;

export const demoAdapter = async (config: AdapterConfig) => {
  const server = await loadServer();
  await latency();
  const { status, body } = server.handle({
    method: config.method ?? 'get',
    url: config.url ?? '',
    params: config.params,
    body: config.data,
    headers: { Authorization: header(config.headers, 'Authorization') },
  });
  const response = { data: body, status, statusText: String(status), headers: {}, config, request: {} };
  if (status >= 400) {
    // 与 axios 默认 adapter 的 settle 行为一致：非 2xx 以带 response 的错误 reject，请求层 errorHandler 按状态码分流
    throw Object.assign(new Error(`Request failed with status code ${status}`), {
      name: 'AxiosError',
      isAxiosError: true,
      code: status >= 500 ? 'ERR_BAD_RESPONSE' : 'ERR_BAD_REQUEST',
      config,
      response,
    });
  }
  return response;
};
