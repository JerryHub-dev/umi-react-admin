/**
 * 真实模式（AUTH_CONFIG.demoMode === false）下 `@/demo/token` 的构建期替身。
 *
 * 为什么需要它：src/services/auth.ts 顶层静态 import { verifyDemoToken } from '@/demo/token'，
 * 调用点在 `if (DEMO_MODE)` 分支里。DEMO_MODE 虽然被 define 折叠成 false，但它是经模块命名空间
 * 读取的（产物里是 `ne.G` 这种属性访问，src/demo/mode.ts 独立成模块、未被内联），所以 webpack
 * 无法把该分支判定为死代码——整个演示 token 模块（含 `'demo.'` 前缀字面量）因此留在真实模式
 * 入口 chunk 里。真实模式不需要它，用替身换掉。
 *
 * 生效方式：config/config.ts 在 demoMode === false 时把 '@/demo/token' alias 到本文件；
 * 演示构建、vitest 与 tsc 仍按原路径解析 src/demo/token.ts。
 *
 * 真实模式下 DEMO_MODE 恒为 false，login() 不会进入演示分支，本函数不应被调用；
 * 一旦被调用说明构建期 alias 与运行时开关不一致，立刻抛错而不是静默放行（放行等于跳过校验）。
 */

/** 构建期哨兵：scripts/real-mode-artifact.test.ts 用它验证第二个 alias 生效（正控制） */
export const REAL_MODE_TOKEN_STUB_SENTINEL = '__REAL_MODE_TOKEN_STUB__';

export const verifyDemoToken = (): never => {
  throw new Error(`${REAL_MODE_TOKEN_STUB_SENTINEL}: the demo token verifier must not be used in real mode`);
};

/** 模块级副作用，别删：理由同 src/demo/adapter.real.ts——哨兵必须留在产物里才能被断言到 */
Object.assign(globalThis, { [REAL_MODE_TOKEN_STUB_SENTINEL]: true });
