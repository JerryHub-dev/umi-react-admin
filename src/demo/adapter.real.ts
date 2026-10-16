/**
 * 真实模式（AUTH_CONFIG.demoMode === false）下 `@/demo/adapter` 的构建期替身。
 *
 * 为什么需要它：src/utils/requestConfig.ts 顶层静态 import 演示 adapter，adapter 又静态
 * import `./clock` 与 `./store`，store → generate → scenarios/catalog/random 会把整份演示数据
 * 生成器（固定场景 ID、补丁存储键、工单/告警模拟数据）拖进**入口 chunk**。真实模式虽然
 * `DEMO_MODE === false`、requestConfig 的 `adapter` 恒为 undefined，但顶层 import 的模块副作用
 * 让打包器无法删除这条链，演示数据因此照常出现在真实产物的首屏脚本里（体积与信息面双输）。
 *
 * 生效方式：config/config.ts 在 `demoMode === false` 时把 '@/demo/adapter' alias 到本文件。
 * 演示构建（build:demo / build:github:demo）与 vitest / tsc 都按原路径解析 src/demo/adapter.ts，
 * 本文件只参与 tsconfig 类型检查，不被任何运行时代码或测试直接引用。
 *
 * 真实模式下 requestConfig 的 `adapter` 为 undefined，本文件的 demoAdapter 不应被调用；
 * 一旦被调用说明「构建期 alias」与「运行时演示开关」不一致（例如演示构建误用了真实配置），
 * 必须立刻抛错而不是静默失败。
 */

/** 构建期哨兵：scripts/real-mode-artifact.test.ts 用它验证 alias 确实生效（正控制） */
export const REAL_MODE_ADAPTER_STUB_SENTINEL = '__REAL_MODE_ADAPTER_STUB__';

export const demoAdapter = async (): Promise<never> => {
  throw new Error(`${REAL_MODE_ADAPTER_STUB_SENTINEL}: the demo adapter must not be used in real mode`);
};

/**
 * 模块级副作用，别删：只导出常量/函数的替身会被压缩器的死代码消除整段清掉，正控制随之失效。
 * 这里把一个诊断用全局置位（值为哨兵字符串），不参与任何业务逻辑，也不读也不写别的全局。
 */
Object.assign(globalThis, { [REAL_MODE_ADAPTER_STUB_SENTINEL]: true });
