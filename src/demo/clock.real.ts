/**
 * 真实模式（AUTH_CONFIG.demoMode === false）下 `@/demo/clock` 的构建期替身。
 *
 * 为什么需要它（独立复审 2026-10-14 发现的功能缺陷）：src/utils/now.ts 顶层静态 import
 * `{ demoClock } from '@/demo/clock'`，而 Signature / Tickets(TicketCard) / Alarms 三个页面
 * 经 `nowMs()` 使用它。入口 chunk 原本不含演示时钟（now.ts 只被页面引用、不进入口），
 * 但这三个懒加载路由 chunk 在真实模式下仍会带上演示时钟模块与它的存储键
 * `umi-react-admin:demo-clock:v1`。
 *
 * 缺陷不只是「多带了一点代码」：demoClock.now() 会读取 localStorage 里的快照，frozen 时返回
 * 场景锚点。如果同一 origin 之前进过固定演示场景并冻结过时钟，真实模式下 `nowMs()` 会继续返回
 * 那个旧锚点，于是「近 3 天验收窗口」「SLA 剩余」「持续时长」全都按错误的时间计算。
 * 真实模式的时间必须恒为系统时间。
 *
 * 生效方式：config/config.ts 在 demoMode === false 时把 '@/demo/clock' alias 到本文件；
 * 演示构建（build:demo / build:github:demo）、vitest 与 tsc 仍按原路径解析 src/demo/clock.ts，
 * 因此本文件不可能影响演示模式的 E2E 与 axe 证据。
 */

/** 构建期哨兵：scripts/real-mode-artifact.test.ts 用它验证第三个 alias 生效（正控制） */
export const REAL_MODE_CLOCK_STUB_SENTINEL = '__REAL_MODE_CLOCK_STUB__';

export type DemoClockMode = 'live' | 'frozen';

export interface DemoClockSnapshot {
  mode: DemoClockMode;
  anchor?: number;
}

/**
 * 真实模式时钟：恒为系统时间，不读也不写任何存储。
 * 故意不实现 freeze/resume/syncFromStorage —— 真实模式不存在「演示时间」这个概念，
 * 调用它们一定是配置错了，直接抛错比静默忽略更容易被发现。
 */
export const demoClock = {
  snapshot: (): DemoClockSnapshot => ({ mode: 'live' }),
  now: (): Date => new Date(),
  freeze: (): never => {
    throw new Error(`${REAL_MODE_CLOCK_STUB_SENTINEL}: the demo clock cannot be frozen in real mode`);
  },
  resume: (): never => {
    throw new Error(`${REAL_MODE_CLOCK_STUB_SENTINEL}: the demo clock cannot be resumed in real mode`);
  },
  syncFromStorage: (): void => undefined,
};

/** 模块级副作用，别删：理由同另外两个替身——哨兵必须留在产物里才能被断言到 */
Object.assign(globalThis, { [REAL_MODE_CLOCK_STUB_SENTINEL]: true });
