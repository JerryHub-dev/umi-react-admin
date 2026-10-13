/**
 * 演示时钟（审查 F09 / D04 的修复核心）。
 *
 * 两种模式：
 * - live：跟随真实时间。演示后端在每次请求前检查时钟，跨过足够时长就按当前时间重建基础数据
 *   （补丁照常叠加），长开页面/跨日刷新不再停留在旧数据上。
 * - frozen：受控演示模式。进入固定演示场景时把时钟锚定在那一刻，排练期间背景数据不会
 *   随真实时间推进而漂移（不会突然失去待办或改变核对基准）。页面必须明确展示「演示时间」。
 *
 * 存储键独立于数据补丁（store.ts），只在本应用命名空间内；重置场景会清理它。
 * 多标签页经 storage 事件互通：另一标签页进入/退出场景或推进时钟时，本标签页感知并同步。
 */

const CLOCK_KEY = 'umi-react-admin:demo-clock:v1';

export type DemoClockMode = 'live' | 'frozen';

export interface DemoClockSnapshot {
  mode: DemoClockMode;
  /** frozen 模式的锚点（epoch ms） */
  anchor?: number;
}

const isSnapshot = (value: unknown): value is DemoClockSnapshot =>
  typeof value === 'object' &&
  value !== null &&
  ((value as Record<string, unknown>).mode === 'live' || (value as Record<string, unknown>).mode === 'frozen');

type Listener = (snapshot: DemoClockSnapshot) => void;

const listeners = new Set<Listener>();
let cached: DemoClockSnapshot | undefined;

const read = (): DemoClockSnapshot => {
  if (cached) return cached;
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(CLOCK_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    cached = isSnapshot(parsed) ? parsed : { mode: 'live' };
  } catch {
    cached = { mode: 'live' };
  }
  return cached;
};

const write = (snapshot: DemoClockSnapshot) => {
  cached = snapshot;
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CLOCK_KEY, JSON.stringify(snapshot));
    }
  } catch {
    // 存储不可用（隐私模式）：只影响本标签页内的受控演示，live 模式不受影响
  }
  listeners.forEach((listener) => listener(snapshot));
};

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== CLOCK_KEY || !event.newValue) return;
    try {
      const parsed = JSON.parse(event.newValue) as unknown;
      if (!isSnapshot(parsed)) return;
      cached = parsed;
      listeners.forEach((listener) => listener(parsed));
    } catch {
      // 无效写入忽略
    }
  });
}

export const demoClock = {
  snapshot: read,
  now: () => {
    const { mode, anchor } = read();
    return mode === 'frozen' && typeof anchor === 'number' ? new Date(anchor) : new Date();
  },
  /** 进入受控演示：冻结在当前时刻（或指定锚点） */
  freeze: (anchor?: number) => write({ mode: 'frozen', anchor: anchor ?? Date.now() }),
  /** 回到实时模式 */
  resume: () => write({ mode: 'live' }),
  clear: () => {
    cached = { mode: 'live' };
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(CLOCK_KEY);
    } catch {
      // 见 write 的注释
    }
    listeners.forEach((listener) => listener(cached!));
  },
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
